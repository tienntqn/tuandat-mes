import type { CartonInput, ContainerResult, PackingSummary, PlacedBox, UnfitCarton } from './container-loading.types'

// ============================================================
// Quy đổi đơn vị tại biên nhập/hiển thị
// ============================================================
// Người dùng nhập kích thước thùng carton theo CM (trực quan hơn với thùng thật), nhưng mọi thứ bên
// trong — CartonInput, kích thước container, toàn bộ thuật toán xếp — đều tính theo MÉT. Hai hàm dưới
// là ranh giới quy đổi duy nhất; ĐỪNG viết lại bản sao cục bộ trong component (đã từng có 2 bản sao
// lệch nhau, sửa 1 chỗ vẫn còn lỗi ở chỗ kia).
//
// Làm tròn về 0.1mm để tránh sai số dấu phẩy động khi quy đổi 2 chiều (24.1cm -> 0.241m -> 24.1cm,
// nếu không làm tròn sẽ ra 24.099999999999998cm) — 0.1mm dư thừa so với nhu cầu đo thùng carton.
export const CM_PER_M = 100
export const cmToM = (cm: number) => Math.round((cm / CM_PER_M) * 1e4) / 1e4
export const mToCm = (m: number) => Math.round(m * CM_PER_M * 10) / 10

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
// - 'xzy' (dùng cho bước lấp hốc & quét dư lẻ của chế độ 'byType'): ưu tiên chiều SÂU (x) nhỏ nhất
//   trước — "xếp từ trong ra cửa, không bỏ trống ô nào khi vẫn còn đủ chỗ". LƯU Ý: thứ tự này CHỈ an
//   toàn khi đi kèm ranh giới X_horizon (minX / maxStartX của runExtremePointFill). Không có ranh giới
//   đó, các điểm cực trị lẻ sót lại ở chiều sâu nhỏ sẽ "hút" thùng của loại sau chui vào giữa khối của
//   loại trước, làm vỡ tính liền mạch của khối — xem packInstancesByType.
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
  const score = (o: { w: number }) => {
    if (o.w > remainingWidth + EPS) return { waste: Infinity, fit: 0 }
    const fit = Math.floor((remainingWidth + EPS) / o.w)
    return { waste: remainingWidth - fit * o.w, fit }
  }
  const sn = score(normal)
  const sr = score(rotated)
  if (Math.abs(sn.waste - sr.waste) > EPS) return sn.waste < sr.waste ? [normal, rotated] : [rotated, normal]
  // HÒA về phần dư (WasteX bằng nhau, thường gặp khi cả 2 hướng đều chia hết bề rộng còn lại): chọn
  // hướng lát được NHIỀU thùng hơn — cạnh ngắn quay ngang nên khối bám sát vách bên phải container,
  // thay vì mặc định luôn lấy hướng "thường" như trước (để lại dải hở dọc trục Y).
  return sn.fit >= sr.fit ? [normal, rotated] : [rotated, normal]
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

// ĐƯỜNG BAO MẶT TIỀN theo bề rộng — profile[i] = chiều sâu đã bị chiếm tại dải bề rộng thứ i (1cm).
// Thay cho việc chỉ giữ 1 con số X_frontier duy nhất: do trộn 2 hướng xoay, các cột của 1 khối ăn sâu
// KHÔNG bằng nhau, nên nếu khối sau phải lùi hết ra sau cột DÀI NHẤT thì mọi cột ngắn hơn để lại 1 hốc
// hình răng cưa chạy suốt chiều cao. Có đường bao, mỗi cột của khối sau tự đẩy sát vào đúng chỗ lõm
// của riêng dải bề rộng nó chiếm.
// Bước lưới 1mm, KHÔNG phải 1cm. Người dùng nhập kích thước theo cm với 1 chữ số thập phân (ô nhập
// step 0.1), nên mọi cạnh thùng đều là bội số nguyên của 1mm — nhờ đó ranh giới 2 cột liền nhau rơi
// đúng vào ranh giới ô lưới và hai cột KHÔNG BAO GIỜ dùng chung ô nào.
//
// Lưới 1cm gây lỗi thật: cột rộng 0.406m chiếm y[0.000, 0.406) → ô 0..40 (vì ceil(40.6) = 41), còn cột
// kế tiếp ở y[0.406, 0.812) lại bắt đầu từ ô 40 (floor(40.6) = 40). Ô 40 bị dùng chung, nên cột sau đọc
// trúng chiều sâu của cột trước và bị đẩy lùi ra — sinh khe hở sát vách dù lẽ ra phải khít.
const PROFILE_STEP = 0.001

// Dải ô lưới NỬA MỞ [i0, i1) ứng với đoạn bề rộng [y0, y1). Dùng Math.round chứ không floor/ceil: giá
// trị chia ra luôn là số nguyên về mặt toán học, chỉ lệch do sai số dấu phẩy động (0.406/0.001 có thể
// ra 405.99999999999994), nên làm tròn về số nguyên gần nhất mới đúng và mới khớp mép giữa 2 cột.
function profileIndexRange(p: Float64Array, y0: number, y1: number): [number, number] {
  const i0 = Math.max(0, Math.round(y0 / PROFILE_STEP))
  const i1 = Math.min(p.length, Math.max(i0 + 1, Math.round(y1 / PROFILE_STEP)))
  return [i0, i1]
}

function profileMax(p: Float64Array, y0: number, y1: number): number {
  const [i0, i1] = profileIndexRange(p, y0, y1)
  let m = 0
  for (let i = i0; i < i1; i++) if (p[i] > m) m = p[i]
  return m
}

function profileRaise(p: Float64Array, y0: number, y1: number, x: number) {
  const [i0, i1] = profileIndexRange(p, y0, y1)
  for (let i = i0; i < i1; i++) if (x > p[i]) p[i] = x
}

// Xếp khối theo TỪNG BỨC TƯỜNG ĐỨNG tiến dần từ trong ra cửa. Mỗi bức tường được lấp KÍN hết chiều
// cao container trước khi sang bức kế tiếp; trong 1 bức thì đi theo hàng từ TRÁI QUA PHẢI, cột từ
// DƯỚI LÊN TRÊN.
//
// Vì sao không xếp theo lớp ngang (đầy sàn rồi mới chồng lên): khi số thùng của 1 loại không đủ lấp
// trọn khối, cách xếp theo lớp để phần thiếu nằm ở CHIỀU CAO — trải mỏng hết mặt sàn rồi hở nguyên
// khoảng trên nóc. Xếp theo tường đứng thì phần thiếu dồn về bức tường NGOÀI CÙNG (phía cửa), chiều
// cao luôn được lấp kín. Với khối ĐẦY thì 2 cách cho kết quả hình học y hệt nhau, chỉ khác ở chỗ
// khoảng trống rơi vào đâu khi thiếu thùng.
//
// Trả về mặt sâu XA NHẤT đã chạm tới, để packInstancesByType dời X_frontier.
function placeBlockWalls(
  plan: ColumnPlan,
  levels: number,
  items: Instance[],
  out: PlacedInternal[],
  profile: Float64Array,
  container: ContainerDims,
): { maxReach: number; minStart: number } {
  if (plan.columns.length === 0 || items.length === 0) return { maxReach: 0, minStart: 0 }
  const ht = items[0].height

  // ĐẨY SÁT THEO TỪNG CỘT: mỗi cột khởi đầu ngay sau phần đã bị chiếm của ĐÚNG dải bề rộng nó chiếm,
  // chứ không phải sau cột dài nhất của khối trước. Nhờ vậy cột nào gặp chỗ lõm thì tự lùi vào lấp,
  // xoá khe răng cưa ở ranh giới 2 loại.
  const colStart: number[] = []
  let yc = 0
  let minStart = Infinity
  for (const col of plan.columns) {
    const s = profileMax(profile, yc, yc + col.widthUsed)
    colStart.push(s)
    if (s < minStart) minStart = s
    yc += col.widthUsed
  }
  if (!isFinite(minStart)) minStart = 0

  let maxDepthCount = 0
  for (const col of plan.columns) if (col.depthCount > maxDepthCount) maxDepthCount = col.depthCount

  let maxReach = minStart
  let cursor = 0
  for (let i = 0; i < maxDepthCount && cursor < items.length; i++) {
    for (let level = 0; level < levels && cursor < items.length; level++) {
      const z = level * ht
      if (z + ht > container.height + EPS) break
      let y = 0
      for (let ci = 0; ci < plan.columns.length; ci++) {
        const col = plan.columns[ci]
        if (cursor >= items.length) break
        const x = colStart[ci] + i * col.depthUsed
        if (i < col.depthCount && x + col.depthUsed <= container.length + EPS) {
          const inst = items[cursor++]
          out.push({
            cartonId: inst.cartonId, label: inst.label, color: inst.color,
            x, y, z,
            length: col.depthUsed, width: col.widthUsed, height: inst.height,
            rotated: col.rotated,
          })
          profileRaise(profile, y, y + col.widthUsed, x + col.depthUsed)
          if (x + col.depthUsed > maxReach) maxReach = x + col.depthUsed
        }
        y += col.widthUsed
      }
    }
  }
  items.splice(0, cursor)
  return { maxReach, minStart }
}

// Đặt 1 lớp ngang (đủ bề rộng container) tại cao độ z, bắt đầu từ chiều sâu `xOffset`. CHỈ dùng cho
// chế độ 'optimized' (packOneContainer) — chế độ 'byType' xếp theo tường đứng, xem placeBlockWalls.
function placeLayerColumns(plan: ColumnPlan, items: Instance[], z: number, out: PlacedInternal[], xOffset = 0): number {
  let y = 0
  let cursor = 0
  let maxReach = xOffset
  for (const col of plan.columns) {
    for (let i = 0; i < col.depthCount && cursor < items.length; i++, cursor++) {
      const inst = items[cursor]
      const x = xOffset + i * col.depthUsed
      out.push({
        cartonId: inst.cartonId, label: inst.label, color: inst.color,
        x, y, z,
        length: col.depthUsed, width: col.widthUsed, height: inst.height,
        rotated: col.rotated,
      })
      if (x + col.depthUsed > maxReach) maxReach = x + col.depthUsed
    }
    y += col.widthUsed
  }
  items.splice(0, cursor)
  return maxReach
}

// ============================================================
// GIAI ĐOẠN 2: Extreme-Point — lấp phần còn lại (thùng lẻ, nhiều loại xen kẽ) vào khoảng trống còn dư
// ============================================================
// Điểm nằm LỌT THỎM bên trong 1 thùng đã xếp thì không đời nào đặt được — loại sớm để mỗi lần sắp xếp
// danh sách điểm không phải kéo theo hàng trăm điểm chết. Điểm nằm ĐÚNG trên mặt (đáy/hông/nóc) của
// thùng vẫn hợp lệ nên dùng so sánh nửa mở [start, end).
function isPointInsideAnyBox(p: Point, index: SpatialIndex): boolean {
  for (const b of index.near(p.x, 0)) {
    if (
      p.x >= b.x - EPS && p.x < b.x + b.length - EPS &&
      p.y >= b.y - EPS && p.y < b.y + b.width - EPS &&
      p.z >= b.z - EPS && p.z < b.z + b.height - EPS
    ) return true
  }
  return false
}

interface EpFillOptions {
  /** Cao độ được coi là "sàn" khi kiểm tra điểm tựa (xem isSupported). Mặc định 0. */
  startZ?: number
  /** Các thùng đã xếp trước đó trong container — dùng để dò va chạm. */
  seedPlaced?: PlacedInternal[]
  /** Điểm mồi thêm (vd khoảng trống theo cột của layer sàn thật — xem computeColumnGaps). */
  extraSeeds?: Point[]
  priorityOrder?: 'zxy' | 'xzy'
  /** Ranh giới X_horizon — chỉ nhận điểm đặt có x >= minX (cấm thụt lùi vào khối đã đóng). */
  minX?: number
  /** Ranh giới X_horizon — chỉ nhận điểm đặt có x < maxStartX (chỉ lấp hốc phía SAU frontier). */
  maxStartX?: number
  /**
   * Thùng phải nằm TRỌN trong x <= maxEndX (không được thò ra ngoài). Dùng cho bước lấp nốt mặt tiền:
   * chỉ nhận thùng lọt gọn vào ô trống sẵn có, không cho đẩy mặt tiền ra xa — nếu để thò ra thì lấp
   * được 1 thùng nhưng đẩy cả khối kế tiếp lùi thêm, lợi bất cập hại.
   */
  maxEndX?: number
  /** Dừng ngay khi 1 thùng không đặt được; mọi thùng còn lại trả nguyên về unplaced. */
  stopOnFirstFailure?: boolean
  /** Sinh điểm cực trị mồi từ seedPlaced — bắt buộc khi gọi nhiều lần trên cùng 1 container. */
  seedPointsFromPlaced?: boolean
}

function runExtremePointFill(
  container: ContainerDims,
  instances: Instance[],
  opts: EpFillOptions = {},
): { placed: PlacedInternal[]; unplaced: Instance[] } {
  const startZ = opts.startZ ?? 0
  const seedPlaced = opts.seedPlaced ?? []
  const priorityOrder = opts.priorityOrder ?? 'zxy'
  const minX = opts.minX ?? 0
  const maxStartX = opts.maxStartX ?? Infinity
  const maxEndX = opts.maxEndX ?? Infinity

  const placed: PlacedInternal[] = []
  const unplaced: Instance[] = []
  const index = new SpatialIndex()
  for (const p of seedPlaced) index.add(p)

  const pointKeys = new Set<string>()
  let points: Point[] = []
  const addPoint = (p: Point) => {
    // RANH GIỚI X_horizon — chốt chặn quan trọng nhất của mode 'byType': điểm nằm ngoài dải
    // [minX, maxStartX) bị loại NGAY LÚC SINH RA. Nhờ vậy giai đoạn "lấp hốc" không tràn ra trước
    // frontier, và giai đoạn "quét dư lẻ" không thụt lùi vào các hốc sâu của khối đã đóng — chính là
    // nguyên nhân khiến thùng loại 3, 4 chui vào giữa khối loại 1, 2 và tạo ra các lát mỏng đan xen.
    if (p.x < minX - EPS || p.x >= maxStartX - EPS) return
    if (p.x > container.length + EPS || p.y > container.width + EPS || p.z > container.height + EPS) return
    const key = `${p.x.toFixed(4)}_${p.y.toFixed(4)}_${p.z.toFixed(4)}`
    if (pointKeys.has(key)) return
    pointKeys.add(key)
    points.push(p)
  }

  addPoint({ x: minX > EPS ? minX : 0, y: 0, z: startZ })
  if (opts.seedPointsFromPlaced) {
    // Dựng lại tập điểm cực trị từ các thùng đã xếp (3 điểm kế tiếp mỗi thùng), vì mỗi loại thùng ở
    // mode 'byType' được gọi bằng 1 lượt runExtremePointFill riêng — lượt sau phải "nhìn thấy" các
    // khoảng trống mà khối của lượt trước để lại.
    for (const b of seedPlaced) {
      addPoint({ x: b.x + b.length, y: b.y, z: b.z })
      addPoint({ x: b.x, y: b.y + b.width, z: b.z })
      addPoint({ x: b.x, y: b.y, z: b.z + b.height })
    }
    points = points.filter((p) => !isPointInsideAnyBox(p, index))
  }
  for (const p of opts.extraSeeds ?? []) addPoint(p)

  let needSort = true
  // Trong 1 lượt gọi, các thùng thường CÙNG kích thước. Nếu 1 thùng đã dò hết mọi điểm mà hỏng và tập
  // điểm chưa hề thay đổi từ đó, thì mọi thùng cùng kích thước phía sau chắc chắn cũng hỏng — bỏ qua
  // luôn thay vì dò lại toàn bộ danh sách điểm cho từng thùng.
  let failedDimsKey: string | null = null

  for (let k = 0; k < instances.length; k++) {
    const inst = instances[k]
    const dimsKey = `${inst.length.toFixed(4)}_${inst.width.toFixed(4)}_${inst.height.toFixed(4)}`
    let done = false

    if (dimsKey !== failedDimsKey) {
      if (needSort) {
        points.sort((a, b) => pointPriority(a, priorityOrder) - pointPriority(b, priorityOrder))
        needSort = false
      }
      // Cạnh ngắn nhất của đáy thùng — cạnh nhỏ nhất có thể chiếm theo bất kỳ hướng xoay nào.
      const minFootprint = Math.min(inst.length, inst.width)

      for (let i = 0; i < points.length; i++) {
        const pt = points[i]
        // LỌC SƠ BỘ (prune điểm cực trị rác): phần bề rộng / chiều cao / chiều sâu CÒN LẠI tính từ
        // điểm này tới vách container đã nhỏ hơn kích thước thùng thì chắc chắn không đặt được — bỏ
        // qua ngay, khỏi phải dò va chạm với hàng trăm thùng lân cận.
        if (container.width - pt.y < minFootprint - EPS) continue
        if (container.height - pt.z < inst.height - EPS) continue
        if (container.length - pt.x < minFootprint - EPS) continue

        // Chỉ 2 chiều xoay hợp lệ: giữ nguyên hoặc hoán đổi dài/rộng — không xoay theo chiều cao. Thử
        // hướng nào lấp khít bề rộng còn lại tại ĐÚNG điểm này trước (xem orientationsByWaste).
        const orientations = orientationsByWaste(inst, container.width - pt.y)
        for (const o of orientations) {
          if (pt.x + o.l > maxEndX + EPS) continue
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
            addPoint({ x: pt.x + o.l, y: pt.y, z: pt.z })
            addPoint({ x: pt.x, y: pt.y + o.w, z: pt.z })
            addPoint({ x: pt.x, y: pt.y, z: pt.z + inst.height })
            needSort = true
            failedDimsKey = null
            done = true
            break
          }
        }
        if (done) break
      }
    }

    if (!done) {
      failedDimsKey = dimsKey
      if (opts.stopOnFirstFailure) {
        // Hết chỗ lấp trong vùng này → theo quy tắc X_horizon, TOÀN BỘ phần còn lại phải quay ra xây
        // khối tường mới tại X >= currentXFrontier thay vì tiếp tục rải rác vào các hốc lẻ.
        for (let j = k; j < instances.length; j++) unplaced.push(instances[j])
        break
      }
      unplaced.push(inst)
    }
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
  const { placed: mopPlaced, unplaced } = runExtremePointFill(container, leftover, {
    startZ: z, seedPlaced: layerPlaced, extraSeeds: floorGapSeeds,
  })

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

// Các độ sâu "khả dĩ" của 1 khối: chỉ có thể là bội số của cạnh dài hoặc cạnh rộng (thùng xếp sát nhau
// theo chiều sâu), tăng dần. Dùng để CO khối lại vừa đủ số lượng thay vì ăn hết chiều sâu còn lại.
function candidateBlockDepths(ln: number, wd: number, maxDepth: number): number[] {
  if (ln <= EPS || wd <= EPS || maxDepth <= EPS) return [maxDepth]
  const seen = new Set<string>()
  const out: number[] = []
  const push = (v: number) => {
    const key = v.toFixed(4)
    if (!seen.has(key)) { seen.add(key); out.push(v) }
  }
  for (let i = 1; i * ln <= maxDepth + EPS; i++) push(i * ln)
  for (let j = 1; j * wd <= maxDepth + EPS; j++) push(j * wd)
  push(maxDepth)
  return out.sort((a, b) => a - b)
}

interface TypeBlock {
  plan: ColumnPlan
  levels: number
}

// Mặt tiền THỰC TẾ của khối = cột ăn sâu nhất trong tổ hợp. Do trộn 2 hướng xoay, các cột có thể dài
// ngắn khác nhau nên mặt tiền lởm chởm; loại kế tiếp buộc phải bắt đầu sau cột dài nhất.
function planFrontReach(plan: ColumnPlan): number {
  let reach = 0
  for (const col of plan.columns) {
    const r = col.depthCount * col.depthUsed
    if (r > reach) reach = r
  }
  return reach
}

// Diện tích mặt cắt của phần "răng cưa" ở mặt tiền: các cột ăn sâu ít hơn cột dài nhất để lại 1 hốc
// chạy suốt chiều cao mà loại kế tiếp KHÔNG lấp được (nó buộc phải bắt đầu sau cột dài nhất). Càng nhỏ
// càng khít — dùng làm tiêu chí phụ khi chọn tổ hợp cột.
function planFrontWedge(plan: ColumnPlan, reach: number): number {
  let wedge = 0
  for (const col of plan.columns) wedge += (reach - col.depthCount * col.depthUsed) * col.widthUsed
  return wedge
}

// TÍCH HỢP KNAPSACK DP VÀO MODE 'byType'
// ========================================
// Quy hoạch khối cho 1 loại thùng bắt đầu tại X_frontier. Với mỗi độ sâu ứng viên, computeColumnPlan
// (unbounded knapsack theo mm trên bề rộng container) cho biết tổ hợp xoay 0°/90° phủ kín bề rộng và
// số thùng chứa được trong 1 lớp; nhân với số tầng theo chiều cao ra sức chứa cả khối.
//
// CỰC TIỂU HOÁ KHE HỞ GIỮA 2 LOẠI (yêu cầu nghiệp vụ): ƯTHIÊN mặt tiền PHẲNG nhất (wedge nhỏ nhất) để
// khối liền mạch không bị chia cắt. Các khoảng trống phía dưới trần hoặc sát vách do cột lởm chởm không
// lấp được là CHẤP NHẬN ĐƯỢC (tránh loại kế tiếp "chui" vào giữa khối này). Trong số các tổ hợp có wedge
// gần bằng, chọn mặt tiền gần nhất (reach nhỏ) để tiết kiệm không gian.
//
// Nếu không độ sâu nào đủ (thùng nhiều hơn sức chứa container) thì lấy trọn phần còn lại — phần thừa
// sang container sau.
function planTypeBlock(
  availableDepth: number,
  container: ContainerDims,
  sample: Instance,
  count: number,
): TypeBlock | null {
  const levels = Math.floor((container.height + EPS) / sample.height)
  if (levels <= 0 || availableDepth <= EPS) return null

  let bestPlan: ColumnPlan | null = null
  let bestReach = Infinity
  let bestWedge = Infinity
  for (const d of candidateBlockDepths(sample.length, sample.width, availableDepth)) {
    const plan = computeColumnPlan(d, container.width, sample.length, sample.width)
    if (plan.capacityPerLayer <= 0) continue
    if (plan.capacityPerLayer * levels < count) continue
    const reach = planFrontReach(plan)
    // ĐỔI THỨ TỰ TIÊU CHÍ: (1) mặt tiền PHẲNG nhất (wedge nhỏ nhất) — bảo đảm không tách khối,
    // (2) mặt tiền gần nhất (reach nhỏ) — tiết kiệm không gian. Cách xếp trước theo thứ tự ngược này
    // để loại kế tiếp chui vào khe hở và chia cắt khối hiện tại.
    const wedge = planFrontWedge(plan, reach)
    if (wedge < bestWedge - EPS || (Math.abs(wedge - bestWedge) < EPS && reach < bestReach - EPS)) {
      bestReach = reach
      bestWedge = wedge
      bestPlan = plan
    }
  }

  const plan = bestPlan ?? computeColumnPlan(availableDepth, container.width, sample.length, sample.width)
  if (plan.capacityPerLayer <= 0) return null
  return { plan, levels }
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
// Chế độ 'byType' — XÂY KHỐI ĐẶC THEO TỪNG LOẠI, tiến dần theo chiều sâu (X_horizon)
// ============================================================
//
// Mỗi loại thùng chiếm 1 KHỐI liền mạch trải hết bề rộng (Y) và hết chiều cao (Z) của container, các
// khối nối tiếp nhau theo chiều sâu (X). Đây là điểm khác biệt cốt lõi so với bản trước — bản trước
// đẩy 100% thùng vào runExtremePointFill nên từ 3 loại thùng trở lên, loại nhỏ (thứ 3, thứ 4) bị các
// điểm cực trị lẻ có x nhỏ "hút" vào hốc sâu giữa khối loại 1 và 2, sinh ra các lát mỏng đan xen và
// bỏ trống nguyên dải dọc vách bên hông.
//
// Với MỖI loại thùng, thuật toán chạy đúng 2 bước, và CẢ HAI đều bị khoá trong vùng x >= X_frontier:
//   A. XÂY KHỐI ĐẶC: Knapsack DP (computeColumnPlan) chọn tổ hợp xoay 0°/90° phủ kín bề rộng, xếp
//      từng lớp trọn vẹn chồng lên hết chiều cao. Độ sâu khối chọn sao cho MẶT TIỀN chạm ra ngoài
//      gần nhất có thể (planTypeBlock) — tức chừa ít chỗ trống nhất ở ranh giới với loại kế tiếp.
//   B. QUÉT DƯ LẺ: phần không đủ 1 lớp trọn vẹn giao cho Extreme-Point, vẫn chặn minX = x0.
//
// TUYỆT ĐỐI KHÔNG lấp ngược về phía sau X_frontier. Khoảng trống loại trước để lại là chấp nhận
// được; loại sau lấn vào đó thì hai loại đan xen nhau, vi phạm yêu cầu "mỗi loại đúng 1 khối".
function packInstancesByType(container: ContainerDims, instances: Instance[], unfitCartons: UnfitCarton[]): ContainerResult[] {
  const groupQueue = groupInstancesByCartonId(instances).map((g) => ({ cartonId: g.cartonId, items: [...g.items] }))
  const containers: ContainerResult[] = []
  let containerIndex = 0

  while (groupQueue.some((g) => g.items.length > 0) && containerIndex < MAX_CONTAINERS) {
    containerIndex++
    const placed: PlacedInternal[] = []
    // X_horizon: mặt vách chiều sâu XA NHẤT đã bị chiếm trong container này. Bất biến then chốt —
    // mọi thùng đặt sau đều phải có x >= giá trị này, nên khối của loại sau không bao giờ đè lên
    // hay xen vào khối của loại trước.
    let currentXFrontier = 0
    // Đường bao mặt tiền theo bề rộng (xem PROFILE_STEP) — cho phép khối sau đẩy sát vào chỗ lõm của
    // khối trước theo TỪNG dải bề rộng, thay vì cả khối phải lùi ra sau cột dài nhất.
    const frontier = new Float64Array(Math.max(1, Math.ceil(container.width / PROFILE_STEP)))
    const advanceFrontier = (boxes: PlacedInternal[]) => {
      for (const b of boxes) {
        if (b.x + b.length > currentXFrontier) currentXFrontier = b.x + b.length
        profileRaise(frontier, b.y, b.y + b.width, b.x + b.length)
      }
    }

    // Toàn bộ Loại 1 (còn dư từ container trước, nếu có) trước, hết mới tới Loại 2...
    for (const group of groupQueue) {
      if (group.items.length === 0) continue
      const sample = group.items[0]

      // --- BƯỚC A: XÂY KHỐI TƯỜNG ĐẶC bằng Knapsack DP tại X_horizon -----------------------
      // KHÔNG cho loại HIỆN TẠI nhét thùng vào mặt tiền của loại TRƯỚC. Lý do: gây phân tách khối.
      // Thay vào đó, để mỗi loại chiếm 1 khối liền mạch hoàn toàn. Khoảng trống sát mặt tiền của
      // loại trước (do phần dư lẻ) được chấp nhận để trống — đó là điểm đánh đổi để không vi phạm
      // quy tắc "1 loại = 1 khối không bị phân tách".
      const x0 = currentXFrontier
      const block = planTypeBlock(container.length - x0, container, sample, group.items.length)
      if (!block) continue

      // YÊU CẦU LÀ "1 KHỐI", KHÔNG PHẢI "1 CONTAINER": nếu chỗ còn lại không chứa hết loại này thì
      // vẫn xếp — lấp KÍN phần đuôi container bằng 1 khối liền mạch, phần thừa sang container sau
      // cũng thành 1 khối liền mạch. Tuyệt đối không bỏ trống cả đoạn đuôi container rồi mở container
      // mới (lỗi cũ: hoãn nguyên loại sang container sau làm đuôi container trước hở rất nhiều).
      //
      // "Không rời rạc" được bảo đảm bởi cách xếp theo tường đứng (placeBlockWalls) + ranh giới
      // X_horizon: trong mỗi container, thùng cùng loại luôn nằm trong đúng 1 dải chiều sâu liền nhau.
      const { maxReach } = placeBlockWalls(block.plan, block.levels, group.items, placed, frontier, container)
      if (maxReach > currentXFrontier) currentXFrontier = maxReach
      if (group.items.length === 0) continue

      // --- BƯỚC B: quét phần DƯ LẺ trong khối vừa xây -------------------------------------------
      // Phần dư lẻ của loại HIỆN TẠI lấp vào khoảng trống TRONG khối của nó, không lấp ra khỏi khối
      // (tránh đan xen với loại khác). Thứ tự 'xzy' (sâu nhất → thấp nhất) khiến thùng lẻ bám vào
      // vị trí sâu nhất có sẵn rồi mới nổi lên.
      //
      // Lưu ý: không dùng maxStartX để giới hạn, để cho phần dư lẻ tận dụng hết khoảng trống trong
      // khối hiện tại. minStart là điểm lùi nhất của cột nên cấm để cho thùng chui sâu hơn.
      const mop = runExtremePointFill(container, group.items, {
        seedPlaced: placed,
        seedPointsFromPlaced: true,
        priorityOrder: 'xzy',
        minX: x0,
        maxStartX: maxReach, // Giới hạn không đẩy frontier xa hơn
      })
      placed.push(...mop.placed)
      advanceFrontier(mop.placed)
      group.items = mop.unplaced
    }

    if (placed.length === 0) {
      // Không xếp thêm được thùng nào — dừng để tránh vòng lặp vô hạn (không nên xảy ra vì đã lọc unfit ở trên)
      for (const g of groupQueue) {
        for (const u of g.items) unfitCartons.push({ cartonId: u.cartonId, label: u.label, reason: 'Không tìm được vị trí xếp phù hợp' })
        g.items = []
      }
      break
    }

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
//   mới đến loại kế tiếp. Mỗi loại chiếm 1 KHỐI ĐẶC trải hết bề rộng và chiều cao, các khối nối tiếp
//   nhau theo chiều sâu và bị chặn bởi ranh giới X_horizon (xem packInstancesByType).
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
