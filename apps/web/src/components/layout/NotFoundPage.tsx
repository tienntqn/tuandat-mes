import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-6xl font-bold text-muted-foreground">404</p>
        <h1 className="text-xl font-semibold">Trang không tồn tại</h1>
        <button
          onClick={() => navigate('/')}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Về trang chủ
        </button>
      </div>
    </div>
  )
}
