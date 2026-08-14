/**
 * Sinh số chứng từ cho phân hệ máy móc thiết bị.
 * Định dạng: <PREFIX><YY><MM>-<số thứ tự 4 chữ số>, ví dụ: BH2608-0001
 * Số thứ tự chạy lại theo từng tháng để dễ tra cứu hồ sơ giấy.
 */
export async function generateDocumentNo(
  prefix: string,
  exists: (no: string) => Promise<boolean>,
  date = new Date(),
): Promise<string> {
  const ym = `${String(date.getFullYear()).slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}`
  for (let seq = 1; seq <= 9999; seq++) {
    const no = `${prefix}${ym}-${String(seq).padStart(4, '0')}`
    if (!(await exists(no))) return no
  }
  // Vượt 9999 chứng từ trong một tháng — rơi về hậu tố thời gian để không chặn nghiệp vụ
  return `${prefix}${ym}-${Date.now()}`
}
