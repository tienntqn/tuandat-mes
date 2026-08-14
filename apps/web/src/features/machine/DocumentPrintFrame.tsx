import type { ReactNode } from 'react'
import { X, Printer } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { companyApi } from '@/features/company/company.api'

export interface SignatureBlock {
  /** Chức danh in dưới ô ký, VD: "Người giao" */
  label: string
  /** Tên người ký nếu đã biết */
  name?: string | null
  /** Dòng phụ dưới chức danh, mặc định "(Ký, ghi rõ họ tên)" */
  hint?: string
}

/**
 * Khung in chứng từ A4 dùng chung cho phân hệ máy móc thiết bị:
 * đầu trang có tên công ty, giữa là nội dung chứng từ, cuối là các ô ký tên.
 */
export function DocumentPrintFrame({
  title,
  documentNo,
  documentDate,
  signatures = [],
  onClose,
  children,
}: {
  title: string
  documentNo?: string
  documentDate?: string | null
  signatures?: SignatureBlock[]
  onClose: () => void
  children: ReactNode
}) {
  const { data: company } = useQuery({ queryKey: ['company'], queryFn: companyApi.get })

  const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '')
  const printedDate = documentDate ? new Date(documentDate) : new Date()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-card border shadow-xl" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between border-b px-5 py-4 sticky top-0 bg-card z-10 no-print">
          <h2 className="font-bold text-lg">{title} {documentNo ? `— ${documentNo}` : ''}</h2>
          <div className="d-flex gap-2 align-items-center">
            <button onClick={() => window.print()} className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1">
              <Printer size={14} /> In / PDF
            </button>
            <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
          </div>
        </div>

        <div className="p-5 doc-print">
          {/* Đầu trang: thông tin công ty */}
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div style={{ maxWidth: '60%' }}>
              <div className="fw-bold text-uppercase">{company?.name ?? 'CÔNG TY CỔ PHẦN TUẤN ĐẠT'}</div>
              {company?.address && <div className="small text-muted">{company.address}</div>}
              {company?.phone && <div className="small text-muted">ĐT: {company.phone}</div>}
            </div>
            <div className="text-center small">
              <div className="fw-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div className="fw-medium">Độc lập - Tự do - Hạnh phúc</div>
              <div>———o0o———</div>
            </div>
          </div>

          <div className="text-center mb-3">
            <div className="fw-bold text-uppercase" style={{ fontSize: 18 }}>{title}</div>
            {documentNo && <div className="small">Số: {documentNo}</div>}
            <div className="small fst-italic">
              Ngày {printedDate.getDate()} tháng {printedDate.getMonth() + 1} năm {printedDate.getFullYear()}
            </div>
          </div>

          {children}

          {signatures.length > 0 && (
            <div className="d-flex justify-content-between mt-4 text-center" style={{ pageBreakInside: 'avoid' }}>
              {signatures.map((s, i) => (
                <div key={i} style={{ width: `${Math.floor(100 / signatures.length) - 2}%` }}>
                  <div className="fw-medium">{s.label}</div>
                  <div className="text-muted small">{s.hint ?? '(Ký, ghi rõ họ tên)'}</div>
                  <div style={{ height: 60 }} />
                  {s.name && <div className="fw-medium small">{s.name}</div>}
                </div>
              ))}
            </div>
          )}

          <div className="d-none d-print-block small text-muted mt-3">In ngày {fmtDate(new Date().toISOString())}</div>
        </div>
      </div>

      <style>{`@media print {
        body * { visibility: hidden; }
        .doc-print, .doc-print * { visibility: visible; }
        .doc-print { position: absolute; left: 0; top: 0; width: 100%; padding: 16px; font-size: 13px; }
        .no-print { display: none !important; }
        @page { size: A4; margin: 12mm; }
      }`}</style>
    </div>
  )
}
