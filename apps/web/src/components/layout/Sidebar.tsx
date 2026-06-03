import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

interface NavSubItem {
  label: string
  path?: string
  icon?: string
  roles?: string[]
  end?: boolean
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

// Nhóm role dùng cho RBAC từng mục con của "Phân hệ Kế hoạch"
const R_COMPANY = ['ADMIN', 'BOD', 'COMPANY_PLANNER']
const R_FACTORY_PLAN = ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY']
const R_DELIVERY = ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_PLANNER']
const R_PROGRESS = ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY']
const R_REPORT = ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER']

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
        label: 'Quản lý máy móc',
        path: '/machines',
        icon: 'fe fe-hard-drive',
        roles: ['ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC'],
        children: [
          { label: 'Danh sách máy', path: '/machines', end: true },
          { label: 'Bảo dưỡng', path: '/machines/maintenance' },
          { label: 'Điều chuyển', path: '/machines/transfers' },
          { label: 'Lịch sử di chuyển', path: '/machines/history' },
        ],
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
              { label: 'Khách hàng', path: '/planning/customers', roles: R_COMPANY },
              { label: 'Mã hàng', path: '/planning/styles', roles: R_COMPANY },
              { label: 'Màu', path: '/planning/colors', roles: R_COMPANY },
              { label: 'Size', path: '/planning/sizes', roles: R_COMPANY },
            ],
          },
          {
            label: 'Đơn hàng',
            children: [
              { label: 'Đơn đặt hàng', path: '/planning/orders', roles: R_COMPANY },
              { label: 'Purchase Order (PO)', path: '/planning/purchase-orders', roles: R_COMPANY },
            ],
          },
          {
            label: 'Kế hoạch sản xuất',
            children: [
              { label: 'Kế hoạch tổng', path: '/planning/plans/company', roles: R_COMPANY },
              { label: 'Kế hoạch theo PO', path: '/planning/plans/by-po', roles: R_COMPANY },
              { label: 'Kế hoạch chuyền may', path: '/planning/plans/factory', roles: R_FACTORY_PLAN },
              { label: 'Kế hoạch giao hàng', path: '/planning/delivery', roles: R_DELIVERY },
            ],
          },
          {
            label: 'Theo dõi tiến độ',
            children: [
              { label: 'Tiến độ cắt', path: '/planning/progress/cutting', roles: R_PROGRESS },
              { label: 'Tiến độ may', path: '/planning/progress/sewing', roles: R_PROGRESS },
              { label: 'Tiến độ hoàn thiện', path: '/planning/progress/finishing', roles: R_PROGRESS },
              { label: 'Tiến độ xuất hàng', path: '/planning/progress/shipping', roles: R_PROGRESS },
            ],
          },
          { label: 'Báo cáo', path: '/planning/reports', roles: R_REPORT },
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
      {
        label: 'Quản lý User',
        path: '/users',
        icon: 'fe fe-users',
        roles: ['ADMIN', 'BOD'],
        children: [
          { label: 'Tài khoản', path: '/users', end: true, roles: ['ADMIN'] },
          { label: 'Nhân viên', path: '/employees', roles: ['ADMIN', 'BOD'] },
        ],
      },
      {
        label: 'Cài đặt',
        path: '/settings',
        icon: 'fe fe-settings',
        roles: ['ADMIN'],
        children: [
          { label: 'Cài đặt chung', path: '/settings', end: true },
          { label: 'Thông tin công ty', path: '/settings/company' },
        ],
      },
    ],
  },
]

// Thu thập mọi path của các node lá nằm dưới một node (để xác định active/expand)
function collectLeafPaths(node: NavSubItem | NavItem): string[] {
  if (node.children) return node.children.flatMap(collectLeafPaths)
  return node.path ? [node.path] : []
}

// RBAC: node lá hiển thị nếu không khai báo roles hoặc user có role phù hợp;
// node nhóm hiển thị nếu có ít nhất 1 con hiển thị.
function isNodeVisible(node: NavSubItem, isAdmin: () => boolean, hasRole: (r: string) => boolean): boolean {
  if (node.children) return node.children.some((c) => isNodeVisible(c, isAdmin, hasRole))
  if (!node.roles || node.roles.length === 0) return true
  return isAdmin() || node.roles.some((r) => hasRole(r))
}

/**
 * Danh sách menu con dạng accordion: tại mỗi cấp chỉ MỘT mục được mở.
 * Khi click vào một nhóm, các nhóm cùng cấp đang mở sẽ tự thu gọn.
 */
function NavTree({ nodes, onClose, isVisible }: { nodes: NavSubItem[]; onClose: () => void; isVisible: (n: NavSubItem) => boolean }) {
  const location = useLocation()
  const visible = nodes.filter(isVisible)
  const activeLabel =
    visible.find((n) => n.children && collectLeafPaths(n).some((p) => location.pathname.startsWith(p)))?.label ?? null
  const [open, setOpen] = useState<string | null>(activeLabel)

  // Mở nhánh chứa route đang active (khi điều hướng bằng URL)
  useEffect(() => {
    if (activeLabel) setOpen(activeLabel)
  }, [activeLabel])

  return (
    <>
      {visible.map((node) => {
        // Node lá → link
        if (!node.children) {
          return (
            <li key={node.label}>
              <NavLink
                to={node.path!}
                end={node.end}
                className={({ isActive }) => `slide-item${isActive ? ' active' : ''}`}
                onClick={onClose}
                style={{ whiteSpace: 'nowrap' }}
              >
                {node.label}
              </NavLink>
            </li>
          )
        }

        // Node nhóm → accordion
        const isOpen = open === node.label
        const isActive = collectLeafPaths(node).some((p) => location.pathname.startsWith(p))
        return (
          <li key={node.label} className={`slide has-sub${isOpen ? ' is-expanded' : ''}`}>
            <a
              className={`side-menu__item${isActive ? ' active' : ''}`}
              href="javascript:void(0);"
              onClick={() => setOpen(isOpen ? null : node.label)}
              style={{ whiteSpace: 'nowrap' }}
            >
              <span className="side-menu__label">{node.label}</span>
              <i
                className="angle fe fe-chevron-right"
                style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
              ></i>
            </a>
            <ul className="slide-menu" style={{ display: isOpen ? 'block' : 'none' }}>
              <NavTree nodes={node.children} onClose={onClose} isVisible={isVisible} />
            </ul>
          </li>
        )
      })}
    </>
  )
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

  const isVisible = (node: NavSubItem) => isNodeVisible(node, isAdmin, hasRole)

  // Accordion cấp 1 (các menu cha): chỉ một menu cha mở tại một thời điểm.
  const topItems = NAV_SECTIONS.flatMap((s) => s.items).filter((i) => i.children)
  const activeTop =
    topItems.find((i) => collectLeafPaths(i).some((p) => location.pathname.startsWith(p)))?.label ?? null
  const [openTop, setOpenTop] = useState<string | null>(activeTop)
  useEffect(() => {
    if (activeTop) setOpenTop(activeTop)
  }, [activeTop])

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
        // Menu cha có con → accordion cấp 1
        if (item.children) {
          const visibleChildren = item.children.filter(isVisible)
          if (visibleChildren.length === 0) return

          const open = openTop === item.label
          const active = collectLeafPaths(item).some((p) => location.pathname.startsWith(p))
          elements.push(
            <li key={item.path} className={`slide has-sub${open ? ' is-expanded' : ''}`}>
              <a
                className={`side-menu__item${active ? ' active' : ''}`}
                href="javascript:void(0);"
                onClick={() => setOpenTop(open ? null : item.label)}
              >
                <i className={`side-menu__icon ${item.icon}`}></i>
                <span className="side-menu__label">{item.label}</span>
                <i
                  className="angle fe fe-chevron-right"
                  style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                ></i>
              </a>
              <ul className="slide-menu" style={{ display: open ? 'block' : 'none' }}>
                <NavTree nodes={item.children} onClose={closeMobileSidebar} isVisible={isVisible} />
              </ul>
            </li>,
          )
          return
        }

        // Menu lá cấp 1 → link trực tiếp
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
