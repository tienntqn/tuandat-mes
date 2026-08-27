import { Canvas } from '@react-three/fiber'
import { OrbitControls, Edges, Html } from '@react-three/drei'
import type { PlacedBox } from './container-loading.types'

interface ContainerSceneProps {
  containerLength: number
  containerWidth: number
  containerHeight: number
  boxes: PlacedBox[]
  showNumbers?: boolean
}

// Ánh xạ hệ trục bài toán (x = chiều sâu từ điểm trong cùng, y = chiều rộng, z = chiều cao)
// sang hệ trục three.js (X = ngang, Y = lên, Z = sâu) để OrbitControls xoay tự nhiên quanh khối.
function toScenePosition(x: number, y: number, z: number, l: number, w: number, h: number): [number, number, number] {
  return [y + w / 2, z + h / 2, x + l / 2]
}

// Chỉ đánh số các thùng NẰM TRÊN 3 TRỤC tọa độ (Ox/Oy/Oz), xuất phát từ góc gốc container
// (x=y=z=0 — trong cùng, sát vách trái, sát sàn). Thùng tại gốc thuộc cả 3 trục, được đánh số 1 chung.
// - Trục Ox (chiều sâu): các thùng có y=0 và z=0 — hàng chạy dọc theo sàn, sát vách trái, số tăng theo x.
// - Trục Oy (chiều rộng): các thùng có x=0 và z=0 — hàng chạy ngang theo sàn, ở vị trí trong cùng, số tăng theo y.
// - Trục Oz (chiều cao/số lớp): các thùng có x=0 và y=0 — cột chạy từ sàn lên, ở góc trong cùng bên trái, số tăng theo z.
const AXIS_EPS = 1e-3
function computeAxisNumbers(boxes: PlacedBox[]): Map<number, number> {
  const onAxis = (pred: (b: PlacedBox) => boolean, sortKey: (b: PlacedBox) => number) =>
    boxes
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => pred(b))
      .sort((p, q) => sortKey(p.b) - sortKey(q.b))

  const ox = onAxis((b) => b.y <= AXIS_EPS && b.z <= AXIS_EPS, (b) => b.x)
  const oy = onAxis((b) => b.x <= AXIS_EPS && b.z <= AXIS_EPS, (b) => b.y)
  const oz = onAxis((b) => b.x <= AXIS_EPS && b.y <= AXIS_EPS, (b) => b.z)

  const map = new Map<number, number>()
  for (const axis of [ox, oy, oz]) {
    axis.forEach(({ i }, order) => map.set(i, order + 1))
  }
  return map
}

// Vị trí đặt số = TRUNG TÂM mặt ngoài của thùng — mặt áp sát vách/sàn container mà hàng/cột trục đó
// chạy dọc theo, không phải mặt trên. Ox áp vách trái (sceneX=0); Oy áp vách trong cùng (sceneZ=0);
// Oz áp đúng góc (cả 2 vách, sceneX=0 và sceneZ=0) vì cột này chạy dọc theo giao tuyến 2 vách.
function axisLabelPosition(b: PlacedBox, sx: number, sy: number, sz: number): [number, number, number] {
  const onOz = b.x <= AXIS_EPS && b.y <= AXIS_EPS
  const onOx = b.y <= AXIS_EPS && b.z <= AXIS_EPS
  if (onOz) return [0, sy, 0]
  if (onOx) return [0, sy, sz]
  return [sx, sy, 0]
}

export function ContainerScene({ containerLength, containerWidth, containerHeight, boxes, showNumbers = true }: ContainerSceneProps) {
  const center: [number, number, number] = [containerWidth / 2, containerHeight / 2, containerLength / 2]
  const maxDim = Math.max(containerLength, containerWidth, containerHeight, 1)
  const axisNumbers = showNumbers ? computeAxisNumbers(boxes) : null

  return (
    <Canvas
      camera={{ position: [maxDim * 1.0, maxDim * 0.85, maxDim * 1.3], fov: 45 }}
      style={{ width: '100%', height: '100%', background: '#eef2f6' }}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[maxDim * 1.5, maxDim * 2.5, maxDim * 1.5]} intensity={0.7} />

      {/* Khung container */}
      <mesh position={center}>
        <boxGeometry args={[containerWidth, containerHeight, containerLength]} />
        <meshStandardMaterial color="#94a3b8" transparent opacity={0.05} depthWrite={false} />
        <Edges color="#334155" />
      </mesh>

      {/* Các thùng đã xếp */}
      {boxes.map((b, i) => {
        const [sx, sy, sz] = toScenePosition(b.x, b.y, b.z, b.length, b.width, b.height)
        const axisNumber = axisNumbers?.get(i)
        return (
          <group key={`${b.cartonId}-${i}`}>
            <mesh position={[sx, sy, sz]}>
              <boxGeometry args={[b.width, b.height, b.length]} />
              <meshStandardMaterial color={b.color} />
              <Edges color="#1f2937" />
            </mesh>
            {axisNumber != null && (
              // Html thay vì <Text> (troika) — troika cần tải font/glyph từ CDN ngoài (cdn.jsdelivr.net) ở
              // lần render đầu, mạng trình duyệt của user chặn được nên số không bao giờ hiện ra. Html dùng
              // font sẵn có của trình duyệt, không phụ thuộc mạng ngoài.
              <Html position={axisLabelPosition(b, sx, sy, sz)} center style={{ pointerEvents: 'none' }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#ffffff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.85), 0 0 3px rgba(0,0,0,0.6)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {axisNumber}
                </div>
              </Html>
            )}
          </group>
        )
      })}

      <OrbitControls target={center} enablePan enableZoom enableRotate makeDefault />
    </Canvas>
  )
}
