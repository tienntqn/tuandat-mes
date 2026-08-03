import { useRef, useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { toast } from '@/lib/toast'
import { factoryPlanApi } from '@/features/plan/plan.api'

export default function SohoConverterPage() {
  const [factoryName, setFactoryName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isPending, setIsPending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    setFile(selected)
  }

  const handleConvert = async () => {
    if (!file) {
      toast.error('Vui lòng chọn file Excel SOHO')
      return
    }
    if (!factoryName.trim()) {
      toast.error('Vui lòng nhập tên xưởng')
      return
    }

    setIsPending(true)
    try {
      const blob = await factoryPlanApi.convertSoho(file, factoryName.trim())
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const originalBaseName = file.name.replace(/\.(xlsx|xls)$/i, '')
      link.download = `${originalBaseName}-daily-report.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Chuyển đổi thành công, file đã được tải xuống')
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể chuyển đổi file SOHO')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <PageWrapper
      title="Chuyển đổi form SOHO"
      breadcrumbs={[
        { label: 'Phân hệ Kế hoạch' },
        { label: 'Tiện ích' },
        { label: 'Chuyển đổi form SOHO' },
      ]}
    >
      <div className="row gy-4">
        <div className="col-xl-8">
          <div className="card">
            <div className="card-body">
              <div className="mb-4">
                <p className="text-muted mb-2">
                  Tải lên file Excel SOHO gốc và nhập tên xưởng. Hệ thống sẽ chuyển đổi sang định dạng Daily Production Report và tự động tải file đầu ra xuống.
                </p>
                <p className="text-muted small mb-0">
                  Hỗ trợ file định dạng .xlsx hoặc .xls.
                </p>
              </div>

              <div className="mb-3">
                <label className="form-label">Tên xưởng</label>
                <input
                  className="form-control"
                  value={factoryName}
                  onChange={(e) => setFactoryName(e.target.value)}
                  placeholder="Ví dụ: Xưởng 1"
                />
              </div>

              <div className="mb-4">
                <label className="form-label">File SOHO</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="form-control"
                  onChange={handleFileChange}
                />
                {file && (
                  <div className="mt-2 text-muted">
                    Đã chọn: <strong>{file.name}</strong>
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConvert}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Đang chuyển đổi...
                  </>
                ) : (
                  <>
                    <i className="fe fe-file-text me-1"></i>
                    Chuyển đổi và tải xuống
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="card border-info">
            <div className="card-body">
              <h6 className="mb-3">Lưu ý</h6>
              <ul className="ps-3 mb-0">
                <li>File đầu vào phải là bảng SOHO hợp lệ.</li>
                <li>Xác nhận tên xưởng đúng để in lên file đầu ra.</li>
                <li>Nếu chuyển đổi thất bại, kiểm tra lại định dạng và cấu trúc file.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
