export interface ContainerPreset {
  code: string
  label: string
  length: number
  width: number
  height: number
}

export interface ContainerGroup {
  group: string
  options: ContainerPreset[]
}

// Kích thước nội thất chuẩn (mét) theo thông số ISO container phổ biến
export const CONTAINER_GROUPS: ContainerGroup[] = [
  {
    group: 'Container 20 Feet',
    options: [
      { code: '20DC', label: "20' Khô (DC/GP)", length: 5.898, width: 2.352, height: 2.395 },
      { code: '20HC', label: "20' Cao (HC)", length: 5.910, width: 2.345, height: 2.690 },
    ],
  },
  {
    group: 'Container 40 Feet',
    options: [
      { code: '40DC', label: "40' Khô (DC/GP)", length: 12.032, width: 2.350, height: 2.392 },
      { code: '40HC', label: "40' Cao (HC)", length: 12.023, width: 2.352, height: 2.698 },
    ],
  },
  {
    group: 'Container 45 Feet',
    options: [
      { code: '45HC', label: "45' Cao (HC)", length: 13.556, width: 2.438, height: 2.695 },
    ],
  },
]

export function findContainerPreset(code: string): ContainerPreset | undefined {
  for (const g of CONTAINER_GROUPS) {
    const found = g.options.find((o) => o.code === code)
    if (found) return found
  }
  return undefined
}

// Bảng màu cố định để phân biệt các loại thùng trên khối 3D
export const CARTON_COLOR_PALETTE = [
  '#4f46e5', '#dc2626', '#059669', '#d97706', '#0891b2',
  '#7c3aed', '#db2777', '#65a30d', '#ea580c', '#0284c7',
]

export function colorForIndex(index: number): string {
  return CARTON_COLOR_PALETTE[index % CARTON_COLOR_PALETTE.length]
}
