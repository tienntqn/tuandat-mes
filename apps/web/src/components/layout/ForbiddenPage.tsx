import { useNavigate } from 'react-router-dom'

export default function ForbiddenPage() {
  const navigate = useNavigate()
  return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
      <div className="text-center">
        <div style={{ fontSize: '5rem', color: '#dc3545' }}>
          <i className="fe fe-shield-off"></i>
        </div>
        <h1 className="mt-3 fw-bold">403 — Không có quyền</h1>
        <p className="text-muted">Bạn không có quyền truy cập trang này.</p>
        <button className="btn btn-primary mt-2" onClick={() => navigate(-1)}>
          <i className="fe fe-arrow-left me-1"></i> Quay lại
        </button>
      </div>
    </div>
  )
}
