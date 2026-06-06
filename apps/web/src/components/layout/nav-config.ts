// Cấu hình điều hướng dùng chung cho Sidebar (menu trái) và SectionTabs (hàng tab cấp-3 dưới breadcrumb).
// Mỗi mục lá có `icon` để hiển thị trên cả hai nơi.

export interface NavSubItem {
  label: string
  path?: string
  icon?: string
  roles?: string[]
  end?: boolean
  children?: NavSubItem[]
}

export interface NavItem {
  label: string
  path: string
  icon: string
  roles?: string[]
  exact?: boolean
  children?: NavSubItem[]
}

export interface NavSection {
  category: string
  items: NavItem[]
}

// Nhóm role dùng cho RBAC từng mục con của "Phân hệ Kế hoạch"
const R_COMPANY = ['ADMIN', 'BOD', 'COMPANY_PLANNER']
const R_FACTORY_PLAN = ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY']
const R_DELIVERY = ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_PLANNER']
const R_PROGRESS = ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY']
const R_REPORT = ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER']

export const NAV_SECTIONS: NavSection[] = [
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
          { label: 'Quản lý xưởng may', path: '/factory-management/factories', icon: 'fe fe-home' },
          { label: 'Quản lý chuyền may', path: '/factory-management/lines', icon: 'fe fe-git-branch' },
        ],
      },
      {
        label: 'Quản lý máy móc',
        path: '/machines',
        icon: 'fe fe-hard-drive',
        roles: ['ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC'],
        children: [
          { label: 'Danh sách máy', path: '/machines', end: true, icon: 'fe fe-hard-drive' },
          { label: 'Bảo dưỡng', path: '/machines/maintenance', icon: 'fe fe-tool' },
          { label: 'Đề xuất sửa chữa', path: '/machines/repairs', icon: 'fe fe-clipboard' },
          { label: 'Điều chuyển', path: '/machines/transfers', icon: 'fe fe-repeat' },
          { label: 'Lịch sử di chuyển', path: '/machines/history', icon: 'fe fe-clock' },
          { label: 'Thanh lý', path: '/machines/liquidation', icon: 'fe fe-trash' },
          { label: 'Hãng sản xuất', path: '/machines/brands', icon: 'fe fe-award' },
          { label: 'Chủng loại', path: '/machines/categories', icon: 'fe fe-grid' },
          { label: 'Phụ tùng', path: '/machines/spare-parts', icon: 'fe fe-package' },
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
              { label: 'Khách hàng', path: '/planning/customers', icon: 'fe fe-users', roles: R_COMPANY },
              { label: 'Mã hàng', path: '/planning/styles', icon: 'fe fe-tag', roles: R_COMPANY },
              { label: 'Màu', path: '/planning/colors', icon: 'fe fe-droplet', roles: R_COMPANY },
              { label: 'Size', path: '/planning/sizes', icon: 'fe fe-maximize-2', roles: R_COMPANY },
            ],
          },
          {
            label: 'Đơn hàng',
            children: [
              { label: 'Đơn đặt hàng', path: '/planning/orders', icon: 'fe fe-file-text', roles: R_COMPANY },
              { label: 'Purchase Order (PO)', path: '/planning/purchase-orders', icon: 'fe fe-shopping-cart', roles: R_COMPANY },
            ],
          },
          {
            label: 'Kế hoạch sản xuất',
            children: [
              { label: 'Kế hoạch tổng', path: '/planning/plans/company', icon: 'fe fe-calendar', roles: R_COMPANY },
              { label: 'Kế hoạch theo PO', path: '/planning/plans/by-po', icon: 'fe fe-list', roles: R_COMPANY },
              { label: 'Kế hoạch chuyền may', path: '/planning/plans/factory', icon: 'fe fe-git-branch', roles: R_FACTORY_PLAN },
              { label: 'Kế hoạch giao hàng', path: '/planning/delivery', icon: 'fe fe-truck', roles: R_DELIVERY },
            ],
          },
          {
            label: 'Theo dõi tiến độ',
            children: [
              { label: 'Tiến độ cắt', path: '/planning/progress/cutting', icon: 'fe fe-scissors', roles: R_PROGRESS },
              { label: 'Tiến độ may', path: '/planning/progress/sewing', icon: 'fe fe-feather', roles: R_PROGRESS },
              { label: 'Tiến độ hoàn thành', path: '/planning/progress/finishing', icon: 'fe fe-check-circle', roles: R_PROGRESS },
              { label: 'Tiến độ xuất hàng', path: '/planning/progress/shipping', icon: 'fe fe-package', roles: R_PROGRESS },
            ],
          },
          { label: 'Báo cáo', path: '/planning/reports', icon: 'fe fe-bar-chart-2', roles: R_REPORT },
        ],
      },
      {
        label: 'Sản lượng',
        path: '/output',
        icon: 'fe fe-clipboard',
        roles: ['ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY'],
      },
      {
        label: 'Bảng lương',
        path: '/payroll',
        icon: 'fe fe-dollar-sign',
        roles: R_REPORT,
        children: [
          { label: 'Lương chuyền may', path: '/payroll/lines', icon: 'fe fe-git-branch', roles: R_REPORT },
          { label: 'Lương Cắt / Hoàn thành', path: '/payroll/sections', icon: 'fe fe-scissors', roles: R_REPORT },
        ],
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
          { label: 'Tài khoản', path: '/users', end: true, icon: 'fe fe-user', roles: ['ADMIN'] },
          { label: 'Nhân viên', path: '/employees', icon: 'fe fe-users', roles: ['ADMIN', 'BOD'] },
        ],
      },
      {
        label: 'Cài đặt',
        path: '/settings',
        icon: 'fe fe-settings',
        roles: ['ADMIN'],
        children: [
          { label: 'Cài đặt chung', path: '/settings', end: true, icon: 'fe fe-sliders' },
          { label: 'Thông tin công ty', path: '/settings/company', icon: 'fe fe-briefcase' },
        ],
      },
    ],
  },
]

// Thu thập mọi path của các node lá nằm dưới một node (để xác định active/expand)
export function collectLeafPaths(node: NavSubItem | NavItem): string[] {
  if (node.children) return node.children.flatMap(collectLeafPaths)
  return node.path ? [node.path] : []
}

// RBAC: node lá hiển thị nếu không khai báo roles hoặc user có role phù hợp;
// node nhóm hiển thị nếu có ít nhất 1 con hiển thị.
export function isNodeVisible(node: NavSubItem, isAdmin: () => boolean, hasRole: (r: string) => boolean): boolean {
  if (node.children) return node.children.some((c) => isNodeVisible(c, isAdmin, hasRole))
  if (!node.roles || node.roles.length === 0) return true
  return isAdmin() || node.roles.some((r) => hasRole(r))
}

// Một mục lá khớp với route hiện tại (dùng để dò nhóm đang active cho SectionTabs)
export function leafPathMatches(path: string, pathname: string): boolean {
  return pathname === path || pathname.startsWith(path + '/')
}

// Tìm danh sách "anh em" (children của nhóm cha) chứa mục lá đang active.
// Trả về null nếu route hiện tại không nằm trong cây này.
export function findActiveSiblings(nodes: NavSubItem[], pathname: string): NavSubItem[] | null {
  // Khớp trực tiếp một lá ở cấp này → trả về cả danh sách anh em
  for (const n of nodes) {
    if (!n.children && n.path && leafPathMatches(n.path, pathname)) return nodes
  }
  // Đệ quy vào các nhóm con
  for (const n of nodes) {
    if (n.children) {
      const found = findActiveSiblings(n.children, pathname)
      if (found) return found
    }
  }
  return null
}
