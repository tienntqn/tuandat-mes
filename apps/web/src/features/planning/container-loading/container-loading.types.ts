// Loại thùng carton người dùng nhập (1 dòng trong bảng nhập liệu)
export interface CartonInput {
  id: string
  label: string
  length: number
  width: number
  height: number
  quantity: number
  color: string
}

// 1 thùng đã được thuật toán đặt vào container
// x = chiều sâu tính từ điểm trong cùng, y = chiều rộng, z = chiều cao tính từ sàn
export interface PlacedBox {
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

export interface ContainerResult {
  index: number
  placedBoxes: PlacedBox[]
  utilizationPercent: number
  placedVolume: number
}

export interface UnfitCarton {
  cartonId: string
  label: string
  reason: string
}

export interface PackingSummary {
  containerTypeCode: string
  containerLength: number
  containerWidth: number
  containerHeight: number
  containers: ContainerResult[]
  containersUsed: number
  overallUtilizationPercent: number
  totalCartonsRequested: number
  totalCartonsPlaced: number
  unfitCartons: UnfitCarton[]
}
