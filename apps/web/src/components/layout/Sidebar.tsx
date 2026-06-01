import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Wrench,
  CalendarDays,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  Factory,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

interface NavItem {
  label: string
  path: string
  icon: React.ElementType
  roles?: string[]
  positions?: string[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Tổng quan',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Master Data',
    path: '/master',
    icon: Building2,
    roles: ['ADMIN', 'COMPANY_PLANNER', 'BOD', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER'],
  },
  {
    label: 'Máy móc',
    path: '/machines',
    icon: Wrench,
    roles: ['ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC'],
  },
  {
    label: 'Kế hoạch',
    path: '/plans',
    icon: CalendarDays,
    roles: ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY'],
  },
  {
    label: 'Sản lượng',
    path: '/output',
    icon: ClipboardList,
    roles: ['ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY'],
  },
  {
    label: 'Báo cáo',
    path: '/reports',
    icon: BarChart3,
    roles: ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER'],
  },
  {
    label: 'Quản lý User',
    path: '/users',
    icon: Users,
    roles: ['ADMIN'],
  },
  {
    label: 'Cài đặt',
    path: '/settings',
    icon: Settings,
    roles: ['ADMIN'],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, hasRole, isAdmin } = useAuthStore()

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true
    if (isAdmin()) return true
    return item.roles.some((r) => hasRole(r))
  })

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-3 gap-2">
        <Factory className="h-6 w-6 shrink-0 text-primary" />
        {!collapsed && (
          <span className="font-bold text-primary truncate">Tuấn Đạt MES</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                collapsed && 'justify-center',
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      {!collapsed && user && (
        <div className="border-t p-3">
          <p className="text-xs font-medium truncate">{user.fullName}</p>
          <p className="text-xs text-muted-foreground truncate">{user.position}</p>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="flex h-10 items-center justify-center border-t text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        title={collapsed ? 'Mở rộng' : 'Thu nhỏ'}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  )
}
