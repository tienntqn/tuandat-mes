import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { NAV_SECTIONS, collectLeafPaths, findActiveSiblings, isNodeVisible, type NavSubItem } from './nav-config'

/**
 * Hàng tab cấp-3 hiển thị ngay dưới breadcrumb.
 * Dò nhóm chứa route hiện tại rồi liệt kê các mục con cùng nhóm (đã lọc RBAC) thành 1 hàng pill có icon.
 * Trả về null nếu route hiện tại không thuộc nhóm nào có nhiều mục con.
 */
export function SectionTabs() {
  const location = useLocation()
  const { isAdmin, hasRole, isMechanic } = useAuthStore()
  const pathname = location.pathname

  // Cơ điện dùng layout riêng đã có thanh tab ngang → không hiện thêm SectionTabs (tránh trùng)
  if (isMechanic() && !isAdmin()) return null

  // Tìm menu cha (cấp 1) chứa route hiện tại, rồi lấy danh sách anh em cấp-3 đang active
  let siblings: NavSubItem[] | null = null
  for (const item of NAV_SECTIONS.flatMap((s) => s.items)) {
    if (!item.children) continue
    if (!collectLeafPaths(item).some((p) => pathname === p || pathname.startsWith(p + '/'))) continue
    siblings = findActiveSiblings(item.children, pathname)
    if (siblings) break
  }

  // Chỉ giữ các mục lá hiển thị được (bỏ node nhóm, lọc RBAC)
  const tabs = (siblings ?? []).filter(
    (n) => !n.children && n.path && isNodeVisible(n, isAdmin, hasRole),
  )

  // Không hiện thanh tab khi chỉ có 1 mục (không cần điều hướng ngang)
  if (tabs.length < 2) return null

  return (
    <div className="section-tabs">
      {tabs.map((t) => (
        <NavLink
          key={t.path}
          to={t.path!}
          end={t.end}
          className={({ isActive }) => `section-tab${isActive ? ' active' : ''}`}
        >
          {t.icon && <i className={t.icon}></i>}
          <span>{t.label}</span>
        </NavLink>
      ))}
    </div>
  )
}
