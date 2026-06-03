import { useRef, useState } from 'react'
import { exportToExcel, downloadTemplate, readExcel, type ExcelRow } from '@/lib/excel'
import { toast } from '@/lib/toast'

interface ExcelToolbarProps {
  /** Tên sheet trong file Excel */
  sheetName: string
  /** Tên file cơ sở: export = `${fileBase}.xlsx`, template = `template-${fileBase}.xlsx` */
  fileBase: string
  /** Hàm trả về dữ liệu hiện tại đã map sang cột để xuất */
  exportRows: () => ExcelRow[]
  /** Một/nhiều dòng mẫu cho file template */
  templateRows: ExcelRow[]
  /** Xử lý import: nhận các dòng đã đọc, trả về số thành công/lỗi. Bỏ trống nếu không cho import. */
  onImport?: (rows: Record<string, string | number>[]) => Promise<{ success: number; error: number }>
  /** Chỉ hiện nút Mẫu/Import khi có quyền ghi */
  canWrite?: boolean
  /** Nhãn thực thể cho thông báo, vd "khách hàng" */
  entityLabel?: string
}

export function ExcelToolbar({ sheetName, fileBase, exportRows, templateRows, onImport, canWrite = true, entityLabel = 'dòng' }: ExcelToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (!onImport) return

    setImporting(true)
    try {
      const rows = await readExcel(file)
      if (rows.length === 0) {
        toast.error('File không có dữ liệu')
        return
      }
      const { success, error } = await onImport(rows)
      if (success > 0) toast.success(`Đã nhập ${success} ${entityLabel}${error > 0 ? `, ${error} lỗi` : ''}`)
      else toast.error(`Không nhập được dòng nào${error > 0 ? ` (${error} lỗi)` : ''}`)
    } catch {
      toast.error('Không thể đọc file Excel')
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      {canWrite && (
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => downloadTemplate(templateRows, sheetName, `template-${fileBase}.xlsx`)}
          title="Tải file mẫu Excel"
        >
          <i className="fe fe-download me-1"></i> Mẫu Excel
        </button>
      )}
      {canWrite && onImport && (
        <button
          className="btn btn-outline-success btn-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          title="Import từ Excel"
        >
          {importing
            ? <><span className="spinner-border spinner-border-sm me-1"></span>Đang nhập...</>
            : <><i className="fe fe-upload me-1"></i> Import Excel</>}
        </button>
      )}
      <button
        className="btn btn-outline-primary btn-sm"
        onClick={() => exportToExcel(exportRows(), sheetName, `${fileBase}.xlsx`)}
        title="Xuất ra Excel"
      >
        <i className="fe fe-file-text me-1"></i> Xuất Excel
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="d-none"
        onChange={handleImport}
      />
    </>
  )
}
