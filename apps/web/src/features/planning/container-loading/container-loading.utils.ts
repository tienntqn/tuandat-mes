import type { CartonInput, ContainerResult, PackingSummary, PlacedBox, UnfitCarton } from './container-loading.types'

interface ContainerDims {
  length: number
  width: number
  height: number
}

interface Instance {
  cartonId: string
  label: string
  color: string
  length: number
  width: number
  height: number
  volume: number
}

interface Point {
  x: number
  y: number
  z: number
}

interface PlacedInternal {
  cartonId: string
  label: string
  color: string
  x: number
  y: number
  z: number
  length: number
  width: number
  height: number
  rotated: boolean
}

const EPS = 1e-6
// Ngưỡng SÀN an toàn tối thiểu (không phải mục tiêu) — thuật toán tìm điểm đặt vốn đã ưu tiên vị trí
// khít nhất trước (pointPriority: thấp → trong cùng → theo chiều rộng), nên nới ngưỡng này chỉ giúp
// KHÔNG loại bỏ những vị trí so le (thùng khác kích thước chồng lên nhau không khớp lưới) nhưng vẫn đủ
// điểm tựa, chứ không khiến kết quả xếp lỏng lẻo hơn. Bắt buộc thêm: tâm đáy thùng phải nằm trên 1
// thùng bên dưới (xem isSupported) để không có khoảng rỗng ngay giữa đáy dù đạt đủ % diện tích.
const SUPPORT_COVERAGE_MIN = 0.5
const MAX_CONTAINERS = 50
// Giới hạn để thuật toán chạy mượt trên trình duyệt — đã benchmark thực tế (node, không phải máy người dùng):
// 900 thùng ~1s, 1500 ~1.6s, 3000 ~13s. Trên 3000 thời gian tăng nhanh vì thuật toán chạy đơn luồng,
// đồng bộ trên UI thread — cần Web Worker mới nới thêm được mà không treo giao diện.
const MAX_TOTAL_INSTANCES = 3000
// Kích thước ô lưới không gian theo trục x (chiều sâu) để chỉ so khớp chồng lấn với các thùng gần đó thay vì toàn bộ
const BUCKET_SIZE = 0.5

function fitsInEmptyContainer(length: number, width: number, height: number, c: ContainerDims): boolean {
  if (height > c.height + EPS) return false
  const normal = length <= c.length + EPS && width <= c.width + EPS
  const rotated = width <= c.length + EPS && length <= c.width + EPS
  return normal || rotated
}

function rectOverlapArea(ax: number, ay: number, al: number, aw: number, bx: number, by: number, bl: number, bw: number): number {
  const x1 = Math.max(ax, bx)
  const x2 = Math.min(ax + al, bx + bl)
  const y1 = Math.max(ay, by)
  const y2 = Math.min(ay + aw, by + bw)
  const dx = x2 - x1
  const dy = y2 - y1
  if (dx <= 0 || dy <= 0) return 0
  return dx * dy
}

function overlapsBox(x: number, y: number, z: number, l: number, w: number, h: number, p: PlacedInternal): boolean {
  return (
    x < p.x + p.length - EPS &&
    x + l > p.x + EPS &&
    y < p.y + p.width - EPS &&
    y + w > p.y + EPS &&
    z < p.z + p.height - EPS &&
    z + h > p.z + EPS
  )
}

// Thùng chỉ hợp lệ nếu đáy tựa lên sàn hoặc lên mặt trên của (các) thùng bên dưới — tránh kết quả 3D
// có thùng "lơ lửng" giữa không trung. CHO PHÉP so le (không cần đè khít 100%, các thùng bên dưới có
// thể khác kích thước/không thẳng lưới với thùng trên), miễn tổng diện tích đè đạt SUPPORT_COVERAGE_MIN
// VÀ tâm đáy thùng (điểm giữa) phải nằm trên 1 thùng bên dưới — không được rỗng ngay chính giữa, dù
// diện tích đè 2 bên cộng lại có đủ %.
function isSupported(x: number, y: number, z: number, l: number, w: number, floorZ: number, placed: PlacedInternal[]): boolean {
  if (z <= floorZ + EPS) return true
  const footprint = l * w
  const centerX = x + l / 2
  const centerY = y + w / 2
  let covered = 0
  let centerCovered = false
  for (const p of placed) {
    if (Math.abs(p.z + p.height - z) < 1e-3) {
      covered += rectOverlapArea(x, y, l, w, p.x, p.y, p.length, p.width)
      if (
        !centerCovered &&
        centerX >= p.x - EPS && centerX <= p.x + p.length + EPS &&
        centerY >= p.y - EPS && centerY <= p.y + p.width + EPS
      ) {
        centerCovered = true
      }
    }
  }
  return centerCovered && covered >= footprint * SUPPORT_COVERAGE_MIN
}

function tryPlace(
  x: number, y: number, z: number, l: number, w: number, h: number,
  container: ContainerDims, floorZ: number, nearby: PlacedInternal[],
): boolean {
  if (x + l > container.length + EPS || y + w > container.width + EPS || z + h > container.height + EPS) return false
  for (const p of nearby) {
    if (overlapsBox(x, y, z, l, w, h, p)) return false
  }
  return isSupported(x, y, z, l, w, floorZ, nearby)
}

// Lưới không gian theo trục x (chiều sâu) — bất kỳ 2 thùng chồng lấn nào cũng phải có khoảng x giao nhau,
// nên chỉ cần so khớp với các thùng nằm trong (các) ô lưới mà vị trí ứng viên đi qua thay vì toàn bộ thùng đã xếp.
class SpatialIndex {
  private buckets = new Map<number, PlacedInternal[]>()

  private range(x: number, l: number): [number, number] {
    return [Math.floor(x / BUCKET_SIZE), Math.floor((x + l) / BUCKET_SIZE)]
  }

  add(box: PlacedInternal) {
    const [b0, b1] = this.range(box.x, box.length)
    for (let b = b0; b <= b1; b++) {
      const arr = this.buckets.get(b)
      if (arr) arr.push(box)
      else this.buckets.set(b, [box])
    }
  }

  near(x: number, l: number): PlacedInternal[] {
    const [b0, b1] = this.range(x, l)
    if (b1 === b0) return this.buckets.get(b0) ?? []
    const seen = new Set<PlacedInternal>()
    const out: PlacedInternal[] = []
    for (let b = b0; b <= b1; b++) {
      const arr = this.buckets.get(b)
      if (!arr) continue
      for (const p of arr) {
        if (!seen.has(p)) {
          seen.add(p)
          out.push(p)
        }
      }
    }
    return out
  }
}

// Thứ tự ưu tiên chọn điểm đặt — có 2 biến thể dùng cho 2 tình huống khác nhau, KHÔNG dùng chung 1 thứ
// tự cho cả 2 vì mục tiêu khác nhau:
// - 'zxy' (mặc định, dùng cho phần "quét dọn thùng lẻ" sau khi đã xây lớp đầy ở chế độ 'optimized'):
//   ưu tiên THẤP lên trước (z nhỏ nhất) — bắt buộc thùng lấy ra sau phải "rớt" vào khoảng trống còn thấp
//   hơn (nóc chưa bằng phẳng do phần dư lẻ) TRƯỚC KHI mở hàng/cột mới cao hơn.
// - 'xzy' (dùng cho chế độ 'byType' — engine chính, không phải quét dọn): ưu tiên chiều SÂU (x) nhỏ nhất
//   trước — bắt buộc thùng lấy ra sau (kể cả khác loại thùng khác với thùng vừa xếp) phải lấp vào đúng
//   vị trí sâu hiện tại (kể cả dở dang giữa chiều cao) TRƯỚC KHI được phép nhảy sang vị trí sâu mới —
//   đây là yêu cầu nghiệp vụ "xếp từ trong ra cửa, không bỏ trống ô nào khi vẫn còn đủ chỗ".
function pointPriority(p: Point, order: 'zxy' | 'xzy' = 'zxy'): number {
  if (order === 'xzy') return p.x * 1_000_000 + p.z * 1_000 + p.y
  return p.z * 1_000_000 + p.x * 1_000 + p.y
}

// GetBestOrientation: tại 1 điểm đặt cụ thể, chọn hướng xoay (0°/90° quanh trục đứng) nào lấp khít phần
// bề rộng CÒN LẠI (từ điểm đó tới vách container) hơn — dựa trên phần dư nếu lát hướng đó liên tiếp
// từ đây tới hết bề rộng (WasteX = remaining % DimX). KHÔNG cố định "luôn thử hướng thường trước" như
// trước đây (bug: hướng xoay gần như không bao giờ được dùng dù khít hơn, để lại nguyên 1 dải hao hụt
// suốt chiều dài) — mỗi điểm tự tính lại vì `remaining` thay đổi theo vị trí, nhờ đó qua nhiều lần đặt
// liên tiếp, thuật toán TỰ ĐỘNG hội tụ về đúng tổ hợp trộn 2 hướng tối ưu (vd container rộng 2.35m,
// thùng 0.61x0.41m: không hướng đơn lẻ nào lấp hết — trộn 4 thường + 1 xoay mới khít, xem ví dụ ở
// container-presets/README) mà không cần dò tổ hợp (a,b) riêng — bản chất tương đương vì mỗi bước đều
// chọn đúng hướng khiến phần dư kế tiếp nhỏ nhất.
function orientationsByWaste(
  inst: Instance,
  remainingWidth: number,
): Array<{ l: number; w: number; rotated: boolean }> {
  const normal = { l: inst.length, w: inst.width, rotated: false }
  const rotated = { l: inst.width, w: inst.length, rotated: true }
  const wasteOf = (o: { w: number }) =>
    o.w <= remainingWidth + EPS ? remainingWidth - Math.floor((remainingWidth + EPS) / o.w) * o.w : Infinity
  return wasteOf(normal) <= wasteOf(rotated) ? [normal, rotated] : [rotated, normal]
}

// ============================================================
// GIAI ĐOẠN 1: "Xây tường theo cột" — quy hoạch động để chọn tổ hợp cột tối ưu cho 1 loại thùng
// ============================================================
//
// Với 1 loại thùng chỉ có 2 chiều xoay hợp lệ (hoán đổi dài/rộng), mỗi "cột" chạy dọc theo chiều sâu
// container có thể dùng 1 trong 2 hướng. Bài toán chọn tổ hợp cột lấp bề rộng container sao cho tổng số
// thùng nhiều nhất là bài toán "unbounded knapsack" kinh điển — giải bằng quy hoạch động theo mm để
// tránh sai số dấu phẩy động. Đây chính là kỹ thuật "1 dãy quay chiều so với dãy khác" mà người xếp
// hàng thực tế hay dùng để lấp khít 2 bên hông container thay vì chỉ dùng 1 hướng duy nhất.
interface ColumnPlanEntry {
  widthUsed: number
  depthUsed: number
  depthCount: number
  rotated: boolean
}
interface ColumnPlan {
  columns: ColumnPlanEntry[]
  capacityPerLayer: number
}

function computeColumnPlan(containerLength: number, containerWidth: number, ln: number, wd: number): ColumnPlan {
  const Wmm = Math.round(containerWidth * 1000)
  const Lmm = Math.round(containerLength * 1000)
  const lnMm = Math.round(ln * 1000)
  const wdMm = Math.round(wd * 1000)
  if (Wmm <= 0 || Lmm <= 0 || lnMm <= 0 || wdMm <= 0) return { columns: [], capacityPerLayer: 0 }

  // Cột "thường": rộng = wd (ngang theo bề rộng), sâu = ln (dọc theo chiều sâu)
  // Cột "xoay":   rộng = ln (ngang theo bề rộng), sâu = wd (dọc theo chiều sâu)
  const valueNormal = Math.floor(Lmm / lnMm)
  const valueRotated = Math.floor(Lmm / wdMm)

  const dp = new Float64Array(Wmm + 1)
  const choice = new Int8Array(Wmm + 1) // 0 = không dùng thêm cột, 1 = thường, 2 = xoay
  for (let w = 1; w <= Wmm; w++) {
    dp[w] = dp[w - 1]
    choice[w] = 0
    if (w >= wdMm && valueNormal > 0) {
      const cand = dp[w - wdMm] + valueNormal
      if (cand > dp[w]) { dp[w] = cand; choice[w] = 1 }
    }
    if (w >= lnMm && valueRotated > 0) {
      const cand = dp[w - lnMm] + valueRotated
      if (cand > dp[w]) { dp[w] = cand; choice[w] = 2 }
    }
  }

  const columns: ColumnPlanEntry[] = []
  let w = Wmm
  while (w > 0) {
    if (choice[w] === 1) {
      columns.push({ widthUsed: wd, depthUsed: ln, depthCount: valueNormal, rotated: false })
      w -= wdMm
    } else if (choice[w] === 2) {
      columns.push({ widthUsed: ln, depthUsed: wd, depthCount: valueRotated, rotated: true })
      w -= lnMm
    } else {
      w -= 1
    }
  }

  return { columns, capacityPerLayer: Math.round(dp[Wmm]) }
}

// Với 1 layer ĐẦY (đủ số lượng, không phải phần dư lẻ), độ sâu thực tế mỗi cột chiếm luôn CỐ ĐỊNH
// = depthCount * depthUsed. Do trộn 2 hướng xoay, các cột có thể ăn sâu KHÔNG BẰNG NHAU và/hoặc không
// cột nào chạm tới hết `targetLength` — phần còn lại (theo TỪNG cột, gộp các cột liền kề cùng độ hụt)
// là khoảng trống thật trên mặt sàn/mặt tựa của layer đó, có thể nhường cho loại thùng khác xếp vào
// (xem cách dùng ở packOneContainer — CHỈ áp dụng an toàn cho layer xây trên SÀN THẬT z=0, vì khi đó
// khoảng trống chắc chắn là sàn container, không có rủi ro lơ lửng).
function computeColumnGaps(plan: ColumnPlan, targetLength: number): { x: number; yOffset: number }[] {
  const gaps: { x: number; yOffset: number; width: number }[] = []
  let y = 0
  for (const col of plan.columns) {
    const y0 = y
    const y1 = y + col.widthUsed
    const reach = col.depthCount * col.depthUsed
    if (reach < targetLength - EPS) {
      const last = gaps[gaps.length - 1]
      if (last && Math.abs(last.x - reach) < EPS && Math.abs(last.yOffset + last.width - y0) < EPS) {
        last.width += y1 - y0
      } else {
        gaps.push({ x: reach, yOffset: y0, width: y1 - y0 })
      }
    }
    y = y1
  }
  return gaps.map((g) => ({ x: g.x, yOffset: g.yOffset }))
}

// Gom các instance cùng kích thước (dài/rộng/cao) thành 1 nhóm, giữ nguyên thứ tự xuất hiện
// (đã sắp xếp thể tích giảm dần từ trước) để biết nhóm nào xử lý trước.
function groupByDimension(instances: Instance[]): { ln: number; wd: number; ht: number; items: Instance[] }[] {
  const map = new Map<string, { ln: number; wd: number; ht: number; items: Instance[] }>()
  const order: string[] = []
  for (const inst of instances) {
    const key = `${inst.length.toFixed(4)}_${inst.width.toFixed(4)}_${inst.height.toFixed(4)}`
    let group = map.get(key)
    if (!group) {
      group = { ln: inst.length, wd: inst.width, ht: inst.height, items: [] }
      map.set(key, group)
      order.push(key)
    }
    group.items.push(inst)
  }
  return order.map((key) => map.get(key)!)
}

function placeLayerColumns(plan: ColumnPlan, items: Instance[], z: number, out: PlacedInternal[]) {
  let y = 0
  let cursor = 0
  for (const col of plan.columns) {
    for (let i = 0; i < col.depthCount && cursor < items.length; i++, cursor++) {
      const inst = items[cursor]
      out.push({
        cartonId: inst.cartonId, label: inst.label, color: inst.color,
        x: i * col.depthUsed, y, z,
        length: col.depthUsed, width: col.widthUsed, height: inst.height,
        rotated: col.rotated,
      })
    }
    y += col.widthUsed
  }
  items.splice(0, cursor)
}

// ============================================================
// GIAI ĐOẠN 2: Extreme-Point — lấp phần còn lại (thùng lẻ, nhiều loại xen kẽ) vào khoảng trống còn dư
// ============================================================
function runExtremePointFill(
  container: ContainerDims,
  instances: Instance[],
  startZ: number,
  seedPlaced: PlacedInternal[],
  extraSeeds: Point[] = [],
  priorityOrder: 'zxy' | 'xzy' = 'zxy',
): { placed: PlacedInternal[]; unplaced: Instance[] } {
  const placed: PlacedInternal[] = []
  const unplaced: Instance[] = []
  const index = new SpatialIndex()
  for (const p of seedPlaced) index.add(p)
  const pointKeys = new Set<string>()
  let points: Point[] = [{ x: 0, y: 0, z: startZ }]
  pointKeys.add(`0.0000_0.0000_${startZ.toFixed(4)}`)
  // Điểm bổ sung từ khoảng trống theo cột của layer sàn thật (xem computeColumnGaps) — cho phép loại
  // thùng khác lấp vào ngay tại ranh giới thay vì chỉ dò từ đỉnh chồng layer trở lên.
  for (const p of extraSeeds) {
    const key = `${p.x.toFixed(4)}_${p.y.toFixed(4)}_${p.z.toFixed(4)}`
    if (!pointKeys.has(key)) {
      pointKeys.add(key)
      points.push(p)
    }
  }

  for (const inst of instances) {
    points.sort((a, b) => pointPriority(a, priorityOrder) - pointPriority(b, priorityOrder))

    let done = false
    for (let i = 0; i < points.length; i++) {
      const pt = points[i]
      // Chỉ 2 chiều xoay hợp lệ: giữ nguyên hoặc hoán đổi dài/rộng — không xoay theo chiều cao. Thử
      // hướng nào lấp khít bề rộng còn lại tại ĐÚNG điểm này trước (xem orientationsByWaste/GetBestOrientation).
      const orientations = orientationsByWaste(inst, container.width - pt.y)
      for (const o of orientations) {
        const nearby = index.near(pt.x, o.l)
        if (tryPlace(pt.x, pt.y, pt.z, o.l, o.w, inst.height, container, startZ, nearby)) {
          const box: PlacedInternal = {
            cartonId: inst.cartonId, label: inst.label, color: inst.color,
            x: pt.x, y: pt.y, z: pt.z, length: o.l, width: o.w, height: inst.height, rotated: o.rotated,
          }
          placed.push(box)
          index.add(box)
          // Điểm vừa dùng không bao giờ còn hợp lệ nữa (đã có thùng chiếm chỗ) — loại khỏi danh sách
          // ngay, tránh tích tụ hàng nghìn điểm "chết" khiến các lần sắp xếp sau ngày càng chậm.
          points.splice(i, 1)

          const newPoints: Point[] = [
            { x: pt.x + o.l, y: pt.y, z: pt.z },
            { x: pt.x, y: pt.y + o.w, z: pt.z },
            { x: pt.x, y: pt.y, z: pt.z + inst.height },
          ]
          for (const np of newPoints) {
            const key = `${np.x.toFixed(4)}_${np.y.toFixed(4)}_${np.z.toFixed(4)}`
            if (!pointKeys.has(key)) {
              pointKeys.add(key)
              points.push(np)
            }
          }
          done = true
          break
        }
      }
      if (done) break
    }
    if (!done) unplaced.push(inst)
  }

  return { placed, unplaced }
}

function packOneContainer(container: ContainerDims, instances: Instance[]): { result: ContainerResult; unplaced: Instance[] } {
  const layerPlaced: PlacedInternal[] = []
  const groups = groupByDimension(instances)
  let z = 0

  // "Chiều dài an toàn" — chiều dài TỐI ĐA mà 1 lớp MỚI (thuộc loại thùng KHÁC loại vừa xây ngay bên
  // dưới) được phép dùng, để đảm bảo không vượt quá phần diện tích mà lớp dưới THỰC SỰ phủ kín (= cột
  // ngắn nhất trong plan của lớp dưới — các cột trong 1 plan có thể dài ngắn khác nhau do trộn 2 hướng
  // xoay). Nếu không giới hạn: khi kích thước 1 loại thùng không chia hết chiều dài container, lớp của
  // nó để lại 1 dải hẹp chưa phủ tới cuối — loại xếp CHỒNG LÊN TRÊN (dùng plan riêng, ngầm coi sàn dưới
  // đã phủ kín hết chiều dài) có thể đặt thùng ngay vào đúng dải hở đó → LƠ LỬNG, không có gì đỡ bên
  // dưới thật sự (bug đã phát hiện thực tế, không phải giả thuyết).
  let safeLength = container.length

  // Khoảng trống theo cột của layer xây trên SÀN THẬT (z=0, xem computeColumnGaps) — an toàn để nhường
  // cho loại thùng khác lấp vào ngay ranh giới (không có rủi ro lơ lửng vì z=0 luôn là sàn container).
  // Chỉ layer đầu tiên thực sự dùng z=0 mới có gap dạng này; các layer chồng lên sau (z>0) đã bị giới
  // hạn effectiveLength theo safeLength nên KHÔNG để lại gap kiểu này (xem comment safeLength ở trên).
  const floorGapSeeds: Point[] = []

  // Xây các lớp "đầy" (dùng đúng tổ hợp cột tối ưu) cho từng loại thùng, ưu tiên loại xử lý trước
  // (thể tích lớn hơn). Chỉ xây lớp khi còn ĐỦ số lượng cho 1 lớp trọn vẹn — phần dư lẻ (không đủ
  // 1 lớp) để lại cho giai đoạn Extreme-Point xen kẽ với các loại khác, tránh lãng phí cả 1 lớp rộng
  // cho vài chục thùng lẻ.
  //
  // Lưu ý: vị trí (x,y,z) từng thùng ở đây chỉ là 1 cách gán tọa độ cho tập thùng CÙNG kích thước —
  // hoán đổi thùng nào vào ô nào trong cùng 1 nhóm không ảnh hưởng hình học. Thứ tự AN TOÀN để công
  // nhân xếp thật (không giẫm lên thùng) được quyết định ở khâu XUẤT PHIẾU (buildLoadingSequence, nhóm
  // theo x tăng dần — trong ra ngoài), không phải ở thứ tự vòng lặp xây dựng tại đây.
  for (const group of groups) {
    if (group.ht > container.height + EPS) continue
    // z > 0 nghĩa là đang xây chồng lên lớp của (1 hoặc nhiều) loại thùng khác đã xây trước đó — phải
    // giới hạn theo safeLength. z === 0 là sàn thật của container, phủ kín toàn bộ chiều dài, không cần giới hạn.
    const effectiveLength = z > 0 ? Math.min(container.length, safeLength) : container.length
    const plan = computeColumnPlan(effectiveLength, container.width, group.ln, group.wd)
    if (plan.capacityPerLayer <= 0) continue
    const isFloorGroup = z === 0
    let builtAnyLayer = false
    while (z + group.ht <= container.height + EPS && group.items.length >= plan.capacityPerLayer) {
      placeLayerColumns(plan, group.items, z, layerPlaced)
      z += group.ht
      builtAnyLayer = true
    }
    if (builtAnyLayer) {
      safeLength = Math.min(...plan.columns.map((c) => c.depthCount * c.depthUsed))
      if (isFloorGroup) {
        for (const g of computeColumnGaps(plan, effectiveLength)) {
          floorGapSeeds.push({ x: g.x, y: g.yOffset, z: 0 })
        }
      }
    }
  }

  const leftover = groups.flatMap((g) => g.items)
  const { placed: mopPlaced, unplaced } = runExtremePointFill(container, leftover, z, layerPlaced, floorGapSeeds)

  const placed = layerPlaced.concat(mopPlaced)
  const placedVolume = placed.reduce((s, p) => s + p.length * p.width * p.height, 0)
  const containerVolume = container.length * container.width * container.height
  const result: ContainerResult = {
    index: 0,
    utilizationPercent: containerVolume > 0 ? (placedVolume / containerVolume) * 100 : 0,
    placedVolume,
    placedBoxes: placed.map((p) => ({
      cartonId: p.cartonId, label: p.label, color: p.color,
      x: p.x, y: p.y, z: p.z, length: p.length, width: p.width, height: p.height, rotated: p.rotated,
    })),
  }
  return { result, unplaced }
}

// Gom các instance theo LOẠI THÙNG (cartonId — đúng 1 dòng nhập của người dùng), giữ nguyên thứ tự xuất
// hiện (đã sắp xếp thể tích giảm dần từ trước) để biết loại nào xử lý trước ở chế độ "theo loại thùng".
// Khác với groupByDimension (gộp cả các loại thùng khác nhau nhưng trùng kích thước) — ở đây tách riêng
// theo từng loại dù kích thước có trùng nhau, vì mục tiêu là KHÔNG trộn loại thùng trong cùng container.
function groupInstancesByCartonId(instances: Instance[]): { cartonId: string; items: Instance[] }[] {
  const map = new Map<string, Instance[]>()
  const order: string[] = []
  for (const inst of instances) {
    let arr = map.get(inst.cartonId)
    if (!arr) {
      arr = []
      map.set(inst.cartonId, arr)
      order.push(inst.cartonId)
    }
    arr.push(inst)
  }
  return order.map((id) => ({ cartonId: id, items: map.get(id)! }))
}

// Lần lượt mở container mới cho tới khi xếp hết `instances` hoặc chạm giới hạn số container (đếm dồn từ
// `startIndex`, dùng chung khi xếp theo loại thùng để không vượt MAX_CONTAINERS tổng thể). Trả về container
// index cuối cùng đã dùng để lời gọi sau (loại thùng kế tiếp) tiếp tục đánh số đúng.
function fillContainers(
  container: ContainerDims,
  instances: Instance[],
  startIndex: number,
  unfitCartons: UnfitCarton[],
): { containers: ContainerResult[]; lastIndex: number } {
  const containers: ContainerResult[] = []
  let pending = instances
  let containerIndex = startIndex

  while (pending.length > 0 && containerIndex < MAX_CONTAINERS) {
    containerIndex++
    const { result, unplaced } = packOneContainer(container, pending)
    result.index = containerIndex
    containers.push(result)
    if (unplaced.length === pending.length) {
      // Không xếp thêm được thùng nào — dừng để tránh vòng lặp vô hạn (không nên xảy ra vì đã lọc unfit ở trên)
      for (const u of unplaced) {
        unfitCartons.push({ cartonId: u.cartonId, label: u.label, reason: 'Không tìm được vị trí xếp phù hợp' })
      }
      pending = []
      break
    }
    pending = unplaced
  }

  if (pending.length > 0) {
    for (const u of pending) {
      unfitCartons.push({ cartonId: u.cartonId, label: u.label, reason: `Đã vượt giới hạn ${MAX_CONTAINERS} container` })
    }
  }

  return { containers, lastIndex: containerIndex }
}

export type PackingMode = 'optimized' | 'byType'

// ============================================================
// Chế độ 'byType': DÙNG CHUNG 1 engine Free-Space/Extreme-Point duy nhất (runExtremePointFill — GIAI
// ĐOẠN 2, vốn đã dùng để quét dọn thùng lẻ cho chế độ 'optimized') cho TOÀN BỘ thùng, không chia vùng
// riêng theo loại. "Gom nhóm theo loại" chỉ là THỨ TỰ đưa thùng vào engine (toàn bộ Loại 1 trước, hết
// mới tới Loại 2...) — chứ KHÔNG phải chia không gian container thành từng khối riêng theo loại.
//
// Danh sách điểm trống (Free Spaces / Extreme Points) dùng CHUNG, LIÊN TỤC cho mọi thùng bất kể loại —
// không hề bị reset hay cắt khi chuyển loại. Mỗi khi lấy 1 thùng ra xếp (kể cả khác loại với thùng vừa
// xếp trước đó), danh sách được sắp lại theo đúng thứ tự ưu tiên 'xzy': Sâu (x, gần vách trong cùng
// nhất) → Cao (z, thấp nhất) → Rộng (y, sát trái nhất) — xem pointPriority. Nhờ vậy nếu Loại 1 hết hàng
// giữa chừng (chưa lấp hết 1 vị trí sâu, kể cả dở dang giữa chiều cao), Loại 2 sẽ tự động rơi đúng vào
// những điểm trống còn sót lại đó TRƯỚC KHI được phép nhảy sang vị trí sâu mới — không cần bất kỳ logic
// "khoảng trống"/"zone" thủ công nào, vì bản thân extreme-point vốn đã tổng quát cho MỌI hình dạng lỗ
// hổng (kể cả những kiểu lỗ hổng chưa lường trước, khác với cách tiếp cận zone+gaps cũ hay bị sót từng
// trường hợp cụ thể — cột lệch chiều sâu, cột dở dang giữa chiều cao... mỗi kiểu phải tự vá riêng).
//
// ĐÁNH ĐỔI: vì không còn "xây lớp đầy" bằng quy hoạch động (nhanh, O(1)/lớp), tốc độ chậm hơn chế độ
// 'optimized' với số lượng rất lớn (extreme-point là O(n) mỗi thùng do phải dò qua danh sách điểm) —
// chấp nhận được vì mode 'byType' phục vụ xuất phiếu hướng dẫn xếp hàng, không phải tính hàng loạt.
function packInstancesByType(container: ContainerDims, instances: Instance[], unfitCartons: UnfitCarton[]): ContainerResult[] {
  const groupQueue = groupInstancesByCartonId(instances).map((g) => ({ cartonId: g.cartonId, items: [...g.items] }))
  const containers: ContainerResult[] = []
  let containerIndex = 0

  while (groupQueue.some((g) => g.items.length > 0) && containerIndex < MAX_CONTAINERS) {
    containerIndex++
    // Toàn bộ Loại 1 (còn dư từ container trước, nếu có) trước, hết mới tới Loại 2... — engine tự lấp
    // vào đúng điểm trống ưu tiên nhất cho TỪNG thùng, không quan tâm thùng đó thuộc loại nào.
    const ordered = groupQueue.flatMap((g) => g.items)
    const { placed, unplaced } = runExtremePointFill(container, ordered, 0, [], [], 'xzy')

    if (placed.length === 0) {
      // Không xếp thêm được thùng nào — dừng để tránh vòng lặp vô hạn (không nên xảy ra vì đã lọc unfit ở trên)
      for (const g of groupQueue) {
        for (const u of g.items) unfitCartons.push({ cartonId: u.cartonId, label: u.label, reason: 'Không tìm được vị trí xếp phù hợp' })
        g.items = []
      }
      break
    }

    const unplacedByCartonId = new Map<string, Instance[]>()
    for (const u of unplaced) {
      const arr = unplacedByCartonId.get(u.cartonId)
      if (arr) arr.push(u)
      else unplacedByCartonId.set(u.cartonId, [u])
    }
    for (const g of groupQueue) g.items = unplacedByCartonId.get(g.cartonId) ?? []

    const placedVolume = placed.reduce((s, p) => s + p.length * p.width * p.height, 0)
    const containerVolume = container.length * container.width * container.height
    containers.push({
      index: containerIndex,
      utilizationPercent: containerVolume > 0 ? (placedVolume / containerVolume) * 100 : 0,
      placedVolume,
      placedBoxes: placed.map((p) => ({
        cartonId: p.cartonId, label: p.label, color: p.color,
        x: p.x, y: p.y, z: p.z, length: p.length, width: p.width, height: p.height, rotated: p.rotated,
      })),
    })
  }

  for (const g of groupQueue) {
    for (const u of g.items) {
      unfitCartons.push({ cartonId: u.cartonId, label: u.label, reason: `Đã vượt giới hạn ${MAX_CONTAINERS} container` })
    }
  }

  return containers
}

// Thuật toán xếp container 2 giai đoạn: (1) xây "tường theo cột" tối ưu bằng quy hoạch động cho từng
// loại thùng (tự động trộn 2 hướng xoay để lấp khít bề rộng, kiểu "1 dãy quay chiều" người xếp hàng
// thực tế hay dùng), (2) dùng Extreme-Point lấp phần dư/thùng lẻ còn lại. Chỉ cho phép xoay quanh trục
// đứng (hoán đổi dài/rộng, giữ nguyên chiều cao — nắp luôn ở trên). Tự động mở container mới khi
// container hiện tại không còn chứa được thùng nào tiếp theo.
//
// 2 CHẾ ĐỘ xếp (mode) — 'byType' là mặc định trên UI (xem ContainerLoadingPage):
// - 'optimized': trộn tất cả loại thùng tự do (xây lớp đầy bằng quy hoạch động) để tối ưu thể tích
//   từng container — nhanh hơn nhưng không đảm bảo "hết loại này mới đến loại khác".
// - 'byType': hoàn thành toàn bộ 1 loại (theo thứ tự thể tích giảm dần, đã sort sẵn ở instances) rồi
//   mới đến loại kế tiếp, dùng chung 1 engine Free-Space (xem packInstancesByType).
//
// Vì thùng carton không chịu được người đứng lên trên, THỨ TỰ xếp thật ngoài kho không được suy ra từ
// thứ tự tính toán ở đây (chỉ là gán tọa độ cho 1 tập hợp thùng đầy kín, không có ý nghĩa thời gian) —
// mà lấy từ buildLoadingSequence() bên dưới, nhóm theo x tăng dần (trong cùng ra cửa) để công nhân luôn
// còn sàn trống phía cửa mà đứng khi xếp cao lên.
export function packContainers(
  containerTypeCode: string,
  container: ContainerDims,
  cartons: CartonInput[],
  mode: PackingMode = 'optimized',
): PackingSummary {
  const unfitCartons: UnfitCarton[] = []
  const validCartons = cartons.filter((c) => {
    if (c.length <= 0 || c.width <= 0 || c.height <= 0 || c.quantity <= 0) return false
    if (!fitsInEmptyContainer(c.length, c.width, c.height, container)) {
      unfitCartons.push({ cartonId: c.id, label: c.label, reason: 'Kích thước thùng vượt quá container (kể cả khi xoay ngang)' })
      return false
    }
    return true
  })

  const totalCartonsRequested = cartons.reduce((s, c) => s + (c.quantity > 0 ? c.quantity : 0), 0)

  let instances: Instance[] = []
  for (const c of validCartons) {
    for (let i = 0; i < c.quantity; i++) {
      instances.push({ cartonId: c.id, label: c.label, color: c.color, length: c.length, width: c.width, height: c.height, volume: c.length * c.width * c.height })
    }
  }

  if (instances.length > MAX_TOTAL_INSTANCES) {
    unfitCartons.push({
      cartonId: '__limit__',
      label: 'Giới hạn số lượng',
      reason: `Tổng số thùng (${instances.length}) vượt quá giới hạn tính toán (${MAX_TOTAL_INSTANCES}). Chỉ ${MAX_TOTAL_INSTANCES} thùng đầu (ưu tiên thể tích lớn) được xếp thử, vui lòng giảm số lượng hoặc chia nhỏ đợt xếp để có kết quả chính xác.`,
    })
  }

  // Largest-first: xếp thùng thể tích lớn trước giúp tối ưu tổ hợp cột và lấp không gian chặt hơn
  instances.sort((a, b) => b.volume - a.volume)
  instances = instances.slice(0, MAX_TOTAL_INSTANCES)

  const containers: ContainerResult[] =
    mode === 'byType'
      ? packInstancesByType(container, instances, unfitCartons)
      : fillContainers(container, instances, 0, unfitCartons).containers

  const totalPlacedVolume = containers.reduce((s, c) => s + c.placedVolume, 0)
  const totalVolume = container.length * container.width * container.height * containers.length
  const totalCartonsPlaced = containers.reduce((s, c) => s + c.placedBoxes.length, 0)

  return {
    containerTypeCode,
    containerLength: container.length,
    containerWidth: container.width,
    containerHeight: container.height,
    containers,
    containersUsed: containers.length,
    overallUtilizationPercent: totalVolume > 0 ? (totalPlacedVolume / totalVolume) * 100 : 0,
    totalCartonsRequested,
    totalCartonsPlaced,
    unfitCartons,
  }
}

// ============================================================
// Phiếu hướng dẫn xếp hàng theo vị trí chiều sâu — dùng để in cho nhân viên xếp container thực tế
// ============================================================
export interface SequenceRow {
  cartonId: string
  label: string
  color: string
  length: number
  width: number
  height: number
  rotated: boolean
  count: number
}
export interface SequenceGroup {
  step: number
  x: number
  rows: SequenceRow[]
}

// Gom các thùng đã xếp theo khoảng cách từ điểm TRONG CÙNG (x) thành từng "vị trí" để nhân viên xếp
// tuần tự từ trong ra cửa — thùng carton không chịu được người đứng lên trên, nên PHẢI xếp kín 1 vị trí
// (đủ bề rộng lẫn chiều cao) rồi mới tiến ra vị trí kế, không được xếp phủ kín cả sàn rồi mới chồng lớp
// trên (sẽ hết sàn trống để đứng). Trong mỗi vị trí gom tiếp theo loại thùng + hướng xoay.
export function buildLoadingSequence(container: ContainerResult): SequenceGroup[] {
  const byX = new Map<string, PlacedBox[]>()
  for (const b of container.placedBoxes) {
    const key = b.x.toFixed(3)
    const arr = byX.get(key)
    if (arr) arr.push(b)
    else byX.set(key, [b])
  }

  const xKeys = [...byX.keys()].sort((a, b) => Number(a) - Number(b))
  return xKeys.map((key, idx) => {
    const boxes = byX.get(key)!
    const rowMap = new Map<string, SequenceRow>()
    for (const b of boxes) {
      const rowKey = `${b.cartonId}_${b.rotated}`
      const cur = rowMap.get(rowKey)
      if (cur) cur.count++
      else rowMap.set(rowKey, { cartonId: b.cartonId, label: b.label, color: b.color, length: b.length, width: b.width, height: b.height, rotated: b.rotated, count: 1 })
    }
    return {
      step: idx + 1,
      x: Number(key),
      rows: [...rowMap.values()].sort((a, b) => b.count - a.count),
    }
  })
}
