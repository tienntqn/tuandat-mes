export function LoadingScreen() {
  return (
    <div style={{ display: 'flex', height: '60vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
        <span className="visually-hidden">Đang tải...</span>
      </div>
      <p className="text-muted">Đang tải...</p>
    </div>
  )
}
