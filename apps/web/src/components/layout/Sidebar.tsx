import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

interface NavItem {
  label: string
  path: string
  icon: string   // Zanex dùng fe fe-* icon classes
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Tổng quan',
    path: '/dashboard',
    icon: 'fe fe-home',
  },
  {
    label: 'Dữ liệu nền',
    path: '/master',
    icon: 'fe fe-database',
    roles: ['ADMIN', 'COMPANY_PLANNER', 'BOD', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER'],
  },
  {
    label: 'Máy móc',
    path: '/machines',
    icon: 'fe fe-tool',
    roles: ['ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC'],
  },
  {
    label: 'Kế hoạch',
    path: '/plans',
    icon: 'fe fe-calendar',
    roles: ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY'],
  },
  {
    label: 'Sản lượng',
    path: '/output',
    icon: 'fe fe-clipboard',
    roles: ['ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY'],
  },
  {
    label: 'Báo cáo',
    path: '/reports',
    icon: 'fe fe-bar-chart-2',
    roles: ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER'],
  },
  {
    label: 'Quản lý User',
    path: '/users',
    icon: 'fe fe-users',
    roles: ['ADMIN'],
  },
  {
    label: 'Cài đặt',
    path: '/settings',
    icon: 'fe fe-settings',
    roles: ['ADMIN'],
  },
]

export function Sidebar() {
  const { hasRole, isAdmin } = useAuthStore()
  const location = useLocation()

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true
    if (isAdmin()) return true
    return item.roles.some((r) => hasRole(r))
  })

  // Đóng sidebar overlay trên mobile sau khi navigate
  useEffect(() => {
    const overlay = document.querySelector('.app-sidebar__overlay') as HTMLElement | null
    if (overlay) overlay.click()
  }, [location.pathname])

  return (
    <div className="sticky">
      <div className="app-sidebar__overlay" data-bs-toggle="sidebar"></div>
      <aside className="app-sidebar">
        {/* Logo */}
        <div className="side-header">
          <a className="header-brand1" href="/">
            <span className="header-brand-img desktop-logo" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', padding: '0 8px' }}>
              Tuấn Đạt MES
            </span>
            <span className="header-brand-img toggle-logo" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>
              TĐ
            </span>
          </a>
        </div>

        {/* Navigation */}
        <div className="main-sidemenu">
          <ul className="side-menu">
            <li className="sub-category">
              <h3>Menu</h3>
            </li>
            {visibleItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path))
              return (
                <li key={item.path} className={`slide ${isActive ? 'active is-expanded' : ''}`}>
                  <NavLink
                    to={item.path}
                    className={`side-menu__item ${isActive ? 'active' : ''}`}
                  >
                    <i className={`side-menu__icon ${item.icon}`}></i>
                    <span className="side-menu__label">{item.label}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </div>
      </aside>
    </div>
  )
}
