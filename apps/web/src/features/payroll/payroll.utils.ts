// Tháng hiện tại dạng YYYY-MM
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

// Định dạng tiền VNĐ (làm tròn, không phần lẻ)
const vnd = new Intl.NumberFormat('vi-VN')
export function formatVnd(n: number): string {
  return vnd.format(Math.round(n || 0))
}

export function formatNum(n: number): string {
  return vnd.format(n || 0)
}
