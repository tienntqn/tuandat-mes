import { Menu, Bell, LogOut, KeyRound, User } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useLogout } from '@/features/auth/auth.hooks'
import { useState, useRef, useEffect } from 'react'

interface TopbarProps {
  onMenuClick?: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useAuthStore()
  const logout = useLogout()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Đóng menu khi click ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="flex h-14 items-center border-b bg-card px-4 gap-3">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:bg-accent"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      {/* Notification bell */}
      <button className="relative p-1.5 rounded-md text-muted-foreground hover:bg-accent">
        <Bell className="h-5 w-5" />
        {/* Badge — sẽ kết nối WebSocket ở Giai đoạn 7 */}
      </button>

      {/* User dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {user?.fullName?.charAt(0) ?? 'U'}
          </div>
          <span className="hidden sm:block max-w-[120px] truncate font-medium">
            {user?.fullName}
          </span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-52 rounded-lg border bg-popover shadow-md z-50">
            <div className="px-3 py-2 border-b">
              <p className="text-sm font-medium">{user?.fullName}</p>
              <p className="text-xs text-muted-foreground">{user?.position}</p>
            </div>
            <div className="p-1">
              <button
                onClick={() => { setMenuOpen(false) }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
              >
                <User className="h-4 w-4" />
                Thông tin cá nhân
              </button>
              <button
                onClick={() => { setMenuOpen(false) }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
              >
                <KeyRound className="h-4 w-4" />
                Đổi mật khẩu
              </button>
              <div className="my-1 border-t" />
              <button
                onClick={() => { setMenuOpen(false); logout() }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
