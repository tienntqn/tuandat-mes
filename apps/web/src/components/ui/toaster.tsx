import { useToastStore } from '@/lib/toast'

const TYPE_CLASS: Record<string, string> = {
  success: 'bg-success text-white',
  error: 'bg-danger text-white',
  info: 'bg-primary text-white',
}

const TYPE_ICON: Record<string, string> = {
  success: 'fe fe-check-circle',
  error: 'fe fe-x-circle',
  info: 'fe fe-info',
}

export function Toaster() {
  const { toasts, remove } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        width: '320px',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`alert d-flex align-items-center gap-2 shadow-lg mb-0 ${TYPE_CLASS[t.type] ?? 'bg-secondary text-white'}`}
          role="alert"
          style={{ borderRadius: '8px' }}
        >
          <i className={TYPE_ICON[t.type] ?? 'fe fe-bell'}></i>
          <span className="flex-grow-1">{t.message}</span>
          <button
            type="button"
            className="btn-close btn-close-white"
            style={{ fontSize: '0.7rem' }}
            onClick={() => remove(t.id)}
            aria-label="Close"
          ></button>
        </div>
      ))}
    </div>
  )
}
