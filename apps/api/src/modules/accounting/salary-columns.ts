import * as XLSX from 'xlsx'

// Map cột Excel (B..AH = các thành phần lương, AP = email) sang field của SalarySlip.
// Đọc theo VỊ TRÍ CỘT (không theo tên header) vì file gốc có 2 dòng tiêu đề gộp ô lệch nhau.
export const NUMBER_COLUMNS: Record<string, string> = {
  F: 'workDays',
  G: 'otSundayNight',
  I: 'otNormalHours',
  J: 'totalWorkHours',
  K: 'convertedWorkDays',
  L: 'workCoefficient',
  M: 'salaryRate',
  N: 'otNormalPay',
  O: 'performanceCoefficient',
  P: 'salarySupport',
  Q: 'fuelAllowance',
  R: 'attendanceBonus',
  S: 'incentiveBonus',
  T: 'holidayPay',
  U: 'paidPersonalLeave',
  V: 'leaveSupport',
  W: 'leaveDays',
  X: 'leavePay',
  Y: 'trainingDays',
  Z: 'menstrualHours',
  AA: 'womenSpecialPay',
  AB: 'totalSalary',
  AC: 'unemploymentInsurance',
  AD: 'socialInsurance',
  AE: 'otherDeduction',
  AF: 'advanceDeduction',
  AG: 'personalIncomeTax',
  AH: 'netSalary',
}

export const TEXT_COLUMNS: Record<string, string> = {
  B: 'department',
  C: 'employeeCode',
  D: 'fullName',
  E: 'bankAccount',
}

export const EMAIL_COLUMN = 'AP'

function cellAt(sheet: XLSX.WorkSheet, row0: number, colLetter: string): XLSX.CellObject | undefined {
  const col0 = XLSX.utils.decode_col(colLetter)
  const addr = XLSX.utils.encode_cell({ r: row0, c: col0 })
  return sheet[addr]
}

export function cellStr(sheet: XLSX.WorkSheet, row0: number, colLetter: string): string {
  const cell = cellAt(sheet, row0, colLetter)
  if (cell == null || cell.v == null) return ''
  return String(cell.v).trim()
}

export function cellNum(sheet: XLSX.WorkSheet, row0: number, colLetter: string): number {
  const cell = cellAt(sheet, row0, colLetter)
  const n = Number(cell?.v)
  return Number.isFinite(n) ? n : 0
}

// Tìm dòng tiêu đề (0-based): dòng có ô cột C chứa "MSNV".
export function findHeaderRowIndex(sheet: XLSX.WorkSheet): number {
  for (let r = 0; r < 10; r++) {
    if (cellStr(sheet, r, 'C').toUpperCase() === 'MSNV') return r
  }
  throw new Error(
    'Không tìm thấy dòng tiêu đề chứa "MSNV" ở cột C trong 10 dòng đầu — file không đúng định dạng bảng lương',
  )
}

// Dòng dữ liệu hợp lệ = cột C (MSNV) hoặc cột D (Họ tên) không rỗng
export function isDataRow(sheet: XLSX.WorkSheet, row0: number): boolean {
  return cellStr(sheet, row0, 'C') !== '' || cellStr(sheet, row0, 'D') !== ''
}

// Sau dòng tiêu đề "MSNV" thường còn 1-2 dòng tiêu đề phụ (do ô C/D gộp nhiều dòng) trước khi
// đến dòng dữ liệu thật — dò bỏ qua các dòng đó thay vì coi dòng trống đầu tiên là hết dữ liệu.
export function findFirstDataRowIndex(sheet: XLSX.WorkSheet, headerRow: number): number {
  const MAX_SKIP = 10
  for (let r = headerRow + 1; r <= headerRow + 1 + MAX_SKIP; r++) {
    if (isDataRow(sheet, r)) return r
  }
  throw new Error('Không tìm thấy dòng dữ liệu nhân viên nào sau dòng tiêu đề — vui lòng kiểm tra lại file')
}
