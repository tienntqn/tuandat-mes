import React, { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

interface NavItem {
  label: string
  path: string
  icon: string
  roles?: string[]
  exact?: boolean
}

interface NavSection {
  category: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    category: 'TỔNG QUAN',
    items: [
      { label: 'Tổng quan', path: '/dashboard', icon: 'fe fe-home', exact: true },
    ],
  },
  {
    category: 'QUẢN LÝ',
    items: [
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
    ],
  },
  {
    category: 'SẢN XUẤT',
    items: [
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
    ],
  },
  {
    category: 'HỆ THỐNG',
    items: [
      { label: 'Quản lý User', path: '/users', icon: 'fe fe-users', roles: ['ADMIN'] },
      { label: 'Cài đặt', path: '/settings', icon: 'fe fe-settings', roles: ['ADMIN'] },
    ],
  },
]

export function Sidebar() {
  const { hasRole, isAdmin } = useAuthStore()
  const location = useLocation()

  // Đóng sidebar trên mobile sau khi navigate
  useEffect(() => {
    if (window.innerWidth < 992) {
      document.body.classList.remove('sidenav-toggled')
    }
  }, [location.pathname])

  const isItemVisible = (item: NavItem) => {
    if (!item.roles) return true
    if (isAdmin()) return true
    return item.roles.some((r) => hasRole(r))
  }

  const isItemActive = (item: NavItem) =>
    item.exact
      ? location.pathname === item.path || location.pathname === '/'
      : location.pathname.startsWith(item.path)

  // Render tất cả items thành danh sách phẳng với sub-category headers
  const renderItems = () => {
    const elements: React.ReactNode[] = []

    NAV_SECTIONS.forEach((section) => {
      const visibleItems = section.items.filter(isItemVisible)
      if (visibleItems.length === 0) return

      elements.push(
        <li key={`cat-${section.category}`} className="sub-category">
          <h3>{section.category}</h3>
        </li>
      )

      visibleItems.forEach((item) => {
        const active = isItemActive(item)
        elements.push(
          <li key={item.path} className={`slide${active ? ' active is-expanded' : ''}`}>
            <NavLink
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `side-menu__item${isActive || active ? ' active' : ''}`
              }
            >
              <i className={`side-menu__icon ${item.icon}`}></i>
              <span className="side-menu__label">{item.label}</span>
            </NavLink>
          </li>
        )
      })
    })

    return elements
  }

  return (
    <div className="sticky">
      <div className="app-sidebar__overlay" data-bs-toggle="sidebar"></div>
      <aside className="app-sidebar">

        {/* Logo */}
        <div className="side-header">
          <a className="header-brand1" href="/">
            <span
              className="header-brand-img desktop-logo"
              style={{ fontWeight: 700, color: '#6259ca', fontSize: '1.05rem', whiteSpace: 'nowrap' }}
            >
              Tuấn Đạt MES
            </span>
            <span
              className="header-brand-img toggle-logo"
              style={{ fontWeight: 700, color: '#6259ca', fontSize: '0.85rem' }}
            >
              TĐ
            </span>
            <span
              className="header-brand-img light-logo"
              style={{ fontWeight: 700, color: '#6259ca', fontSize: '1.05rem', whiteSpace: 'nowrap' }}
            >
              Tuấn Đạt MES
            </span>
            <span
              className="header-brand-img light-logo1"
              style={{ fontWeight: 700, color: '#6259ca', fontSize: '1.05rem', whiteSpace: 'nowrap' }}
            >
              Tuấn Đạt MES
            </span>
          </a>
        </div>

        {/* Navigation */}
        <div className="main-sidemenu">
          <ul className="side-menu">
            {renderItems()}
          </ul>
        </div>
      </aside>
    </div>
  )
}
