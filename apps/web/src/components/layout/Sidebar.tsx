import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { NAV_SECTIONS, collectLeafPaths, isNodeVisible, type NavItem, type NavSubItem } from './nav-config'

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
