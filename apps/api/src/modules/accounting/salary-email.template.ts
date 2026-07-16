// Render nội dung email phiếu lương (bảng HTML) — không dùng file đính kèm PDF.

interface SalarySlipLike {
  employeeCode: string
  fullName: string
  department: string | null
  workDays: unknown
  otSundayNight: unknown
  otNormalHours: unknown
  totalWorkHours: unknown
  convertedWorkDays: unknown
  workCoefficient: unknown
  salaryRate: unknown
  otNormalPay: unknown
  performanceCoefficient: unknown
  salarySupport: unknown
  fuelAllowance: unknown
  attendanceBonus: unknown
  incentiveBonus: unknown
  holidayPay: unknown
  paidPersonalLeave: unknown
  leaveSupport: unknown
  leaveDays: unknown
  leavePay: unknown
  trainingDays: unknown
  menstrualHours: unknown
  womenSpecialPay: unknown
  totalSalary: unknown
  unemploymentInsurance: unknown
  socialInsurance: unknown
  otherDeduction: unknown
  advanceDeduction: unknown
  personalIncomeTax: unknown
  netSalary: unknown
}

const fmt = new Intl.NumberFormat('vi-VN')
const n = (v: unknown): string => fmt.format(Number(v ?? 0))

// Các trường tiền (VNĐ) làm tròn về số nguyên, không hiển thị số thập phân
const moneyFmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })
const money = (v: unknown): string => moneyFmt.format(Math.round(Number(v ?? 0)))

function row(label: string, value: string, strong = false): string {
  const style = strong ? 'font-weight:600;background:#f3f4f6' : ''
  return `<tr style="${style}"><td style="padding:6px 10px;border:1px solid #e5e7eb">${label}</td><td style="padding:6px 10px;border:1px solid #e5e7eb;text-align:right">${value}</td></tr>`
}

export function renderSalaryEmailHtml(slip: SalarySlipLike, month: number, year: number): string {
  const rows = [
    row('Ngày công', n(slip.workDays)),
    row('Tăng ca chủ nhật, đêm (giờ)', n(slip.otSundayNight)),
    row('Tăng ca bình thường (giờ)', n(slip.otNormalHours)),
    row('Tổng giờ làm việc', n(slip.totalWorkHours)),
    row('Ngày công quy đổi', n(slip.convertedWorkDays)),
    row('Hệ số làm việc', n(slip.workCoefficient)),
    row('Mức lương', money(slip.salaryRate)),
    row('Tiền lương tăng ca bình thường', money(slip.otNormalPay)),
    row('Hệ số phụ cấp gắn với kết quả công việc', money(slip.performanceCoefficient)),
    row('Hỗ trợ lương', money(slip.salarySupport)),
    row('PC xăng xe', money(slip.fuelAllowance)),
    row('Tiền chuyên cần', money(slip.attendanceBonus)),
    row('Tiền thi đua', money(slip.incentiveBonus)),
    row('Tiền lương ngày lễ, tết', money(slip.holidayPay)),
    row('Việc riêng có lương', money(slip.paidPersonalLeave)),
    row('Hỗ trợ ngày phép', money(slip.leaveSupport)),
    row('Ngày phép', n(slip.leaveDays)),
    row('Tiền phép', money(slip.leavePay)),
    row('Công huấn luyện', n(slip.trainingDays)),
    row('Giờ hành kinh', n(slip.menstrualHours)),
    row('Lương phụ nữ ngày HK, huấn luyện', money(slip.womenSpecialPay)),
    row('Tổng cộng tiền lương', money(slip.totalSalary), true),
    row('BHTNg', money(slip.unemploymentInsurance)),
    row('9.5% BHXH', money(slip.socialInsurance)),
    row('Trừ khác', money(slip.otherDeduction)),
    row('Trừ ứng ngoài', money(slip.advanceDeduction)),
    row('Trừ thuế TNCN', money(slip.personalIncomeTax)),
    row('Tiền lương thực nhận cuối kỳ', money(slip.netSalary), true),
  ].join('')

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#111827;max-width:640px;margin:0 auto">
    <h2 style="margin-bottom:4px">BẢNG THANH TOÁN TIỀN LƯƠNG</h2>
    <p style="margin-top:0;color:#4b5563">Tháng ${month.toString().padStart(2, '0')}/${year}</p>
    <p>
      Kính gửi <strong>${slip.fullName}</strong> (MSNV: ${slip.employeeCode}${slip.department ? `, ${slip.department}` : ''}),<br/>
      Phòng Kế toán Công ty Cổ phần Tuấn Đạt gửi bảng lương chi tiết tháng ${month}/${year} như sau:
    </p>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      ${rows}
    </table>
    <p style="color:#6b7280;font-size:12px;margin-top:16px">
      Đây là email tự động từ hệ thống Tuấn Đạt MES. Vui lòng liên hệ phòng Kế toán nếu có thắc mắc về bảng lương.
    </p>
  </div>`
}
