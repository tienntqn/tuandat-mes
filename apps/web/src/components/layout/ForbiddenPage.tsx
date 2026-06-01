import { useNavigate } from 'react-router-dom'
import { ShieldX } from 'lucide-react'

export default function ForbiddenPage() {
  const navigate = useNavigate()
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center space-y-4">
        <ShieldX className="mx-auto h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Không có quyền truy cập</h1>
        <p className="text-muted-foreground">
          Bạn không có quyền xem trang này.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Quay lại
        </button>
      </div>
    </div>
  )
}
