// Tiện ích Excel dùng chung cho import/export/template (dùng xlsx, import động để giảm bundle)
export type ExcelRow = Record<string, string | number | null | undefined>

export async function exportToExcel(rows: ExcelRow[], sheetName: string, fileName: string) {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
  XLSX.writeFile(wb, fileName)
}

export async function downloadTemplate(sampleRows: ExcelRow[], sheetName: string, fileName: string) {
  await exportToExcel(sampleRows, sheetName, fileName)
}

export async function readExcel(file: File): Promise<Record<string, string | number>[]> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<Record<string, string | number>>(ws)
}

// Helpers đọc ô an toàn
export const cellStr = (v: unknown): string => String(v ?? '').trim()
export const cellNum = (v: unknown, fallback = 0): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
