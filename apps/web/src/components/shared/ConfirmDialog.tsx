interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  destructive?: boolean
  isPending?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Xác nhận',
  destructive = false,
  isPending = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="modal show"
      style={{ display: 'block', background: 'rgba(0,0,0,0.4)', position: 'fixed', inset: 0, zIndex: 1055 }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" onClick={onClose} disabled={isPending}></button>
          </div>
          <div className="modal-body">
            <p className="text-muted mb-0">{description}</p>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isPending}
            >
              Hủy
            </button>
            <button
              type="button"
              className={`btn ${destructive ? 'btn-danger' : 'btn-primary'}`}
              onClick={onConfirm}
              disabled={isPending}
            >
              {isPending
                ? <><span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Đang xử lý...</>
                : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
