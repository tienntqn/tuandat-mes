import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

interface NavSubItem {
  label: string
  path?: string
  icon?: string
  children?: NavSubItem[]
}

interface NavItem {
  label: string
  path: string
  icon: string
  roles?: string[]
  exact?: boolean
  children?: NavSubItem[]
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
        label: 'Quản lý nhà máy',
        path: '/factory-management',
        icon: 'fe fe-layers',
        roles: ['ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'COMPANY_PLANNER'],
        children: [
          { label: 'Quản lý xưởng may', path: '/factory-management/factories' },
          { label: 'Quản lý chuyền may', path: '/factory-management/lines' },
        ],
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
    ],
  },
  {
    category: 'SẢN XUẤT',
    items: [
      {
        label: 'Phân hệ Kế hoạch',
        path: '/planning',
        icon: 'fe fe-calendar',
        roles: ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY'],
        children: [
          {
            label: 'Danh mục',
            children: [
              { label: 'Khách hàng', path: '/planning/customers' },
              { label: 'Mã hàng', path: '/planning/styles' },
            ],
          },
          {
            label: 'Đơn hàng',
            children: [
              { label: 'Đơn đặt hàng', path: '/planning/orders' },
              { label: 'Purchase Order (PO)', path: '/planning/purchase-orders' },
            ],
          },
          {
            label: 'Kế hoạch sản xuất',
            children: [
              { label: 'Kế hoạch tổng', path: '/planning/plans/company' },
              { label: 'Kế hoạch theo PO', path: '/planning/plans/by-po' },
              { label: 'Kế hoạch chuyền may', path: '/planning/plans/factory' },
              { label: 'Kế hoạch giao hàng', path: '/planning/delivery' },
            ],
          },
          {
            label: 'Theo dõi tiến độ',
            children: [
              { label: 'Tiến độ cắt', path: '/planning/progress/cutting' },
              { label: 'Tiến độ may', path: '/planning/progress/sewing' },
              { label: 'Tiến độ hoàn thiện', path: '/planning/progress/finishing' },
              { label: 'Tiến độ xuất hàng', path: '/planning/progress/shipping' },
            ],
          },
          { label: 'Báo cáo', path: '/planning/reports' },
        ],
      },
      {
        label: 'Sản lượng',
        path: '/output',
        icon: 'fe fe-clipboard',
        roles: ['ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY'],
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

// Thu thập mọi path của các node lá nằm dưới một node (để xác định active/expand)
function collectLeafPaths(node: NavSubItem): string[] {
  if (node.children) return node.children.flatMap(collectLeafPaths)
  return node.path ? [node.path] : []
}

// Render đệ quy: hỗ trợ menu nhiều cấp (Phân hệ Kế hoạch → nhóm → mục con)
function NavNode({ node, depth, icon, onClose }: { node: NavSubItem; depth: number; icon?: string; onClose: () => void }) {
  const location = useLocation()
  const isActive = collectLeafPaths(node).some((p) => location.pathname.startsWith(p))
  const [open, setOpen] = useState(isActive)

  useEffect(() => {
    if (isActive) setOpen(true)
  }, [isActive])

  // Node lá → link
  if (!node.children) {
    return (
      <li>
        <NavLink
          to={node.path!}
          className={({ isActive: a }) => `slide-item${a ? ' active' : ''}`}
          onClick={onClose}
          style={{ paddingLeft: 18 + depth * 12 }}
        >
          {node.label}
        </NavLink>
      </li>
    )
  }

  // Node nhóm → mở/đóng
  return (
    <li className={`slide has-sub${open || isActive ? ' is-expanded' : ''}`}>
      <a
        className={`side-menu__item${isActive ? ' active' : ''}`}
        href="javascript:void(0);"
        onClick={() => setOpen((v) => !v)}
        style={depth > 0 ? { paddingLeft: 18 + (depth - 1) * 12 } : undefined}
      >
        {depth === 0 && icon && <i className={`side-menu__icon ${icon}`}></i>}
        <span className="side-menu__label">{node.label}</span>
        <i
          className="angle fe fe-chevron-right"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        ></i>
      </a>
      <ul className="slide-menu" style={{ display: open ? 'block' : 'none' }}>
        {node.children.map((child) => (
          <NavNode key={child.label} node={child} depth={depth + 1} onClose={onClose} />
        ))}
      </ul>
    </li>
  )
}

function SubMenuNav({ item, onClose }: { item: NavItem; onClose: () => void }) {
  return <NavNode node={item} depth={0} icon={item.icon} onClose={onClose} />
}

export function Sidebar() {
  const { hasRole, isAdmin } = useAuthStore()
  const location = useLocation()

  // Đóng sidebar trên mobile sau khi navigate
  const closeMobileSidebar = () => {
    if (window.innerWidth < 992) {
      document.body.classList.remove('sidenav-toggled')
    }
  }

  useEffect(() => {
    closeMobileSidebar()
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

  const renderItems = () => {
    const elements: React.ReactNode[] = []

    NAV_SECTIONS.forEach((section) => {
      const visibleItems = section.items.filter(isItemVisible)
      if (visibleItems.length === 0) return

      elements.push(
        <li key={`cat-${section.category}`} className="sub-category">
          <h3>{section.category}</h3>
        </li>,
      )

      visibleItems.forEach((item) => {
        if (item.children) {
          elements.push(
            <SubMenuNav key={item.path} item={item} onClose={closeMobileSidebar} />,
          )
          return
        }

        const active = isItemActive(item)
        elements.push(
          <li key={item.path} className={`slide${active ? ' active is-expanded' : ''}`}>
            <NavLink
              to={item.path}
              end={item.exact}
              className={({ isActive }) => `side-menu__item${isActive || active ? ' active' : ''}`}
              onClick={closeMobileSidebar}
            >
              <i className={`side-menu__icon ${item.icon}`}></i>
              <span className="side-menu__label">{item.label}</span>
            </NavLink>
          </li>,
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
            <span className="header-brand-img desktop-logo" style={{ fontWeight: 700, color: '#6259ca', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
              Tuấn Đạt MES
            </span>
            <span className="header-brand-img toggle-logo" style={{ fontWeight: 700, color: '#6259ca', fontSize: '0.85rem' }}>
              TĐ
            </span>
            <span className="header-brand-img light-logo" style={{ fontWeight: 700, color: '#6259ca', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
              Tuấn Đạt MES
            </span>
            <span className="header-brand-img light-logo1" style={{ fontWeight: 700, color: '#6259ca', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
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
