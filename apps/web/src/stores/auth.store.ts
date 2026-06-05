import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Position =
  | 'COMPANY_PLANNER'
  | 'BOD'
  | 'ADMIN'
  | 'FACTORY_DIRECTOR'
  | 'FACTORY_PLANNER'
  | 'LINE_LEADER'
  | 'LINE_DEPUTY'
  | 'MECHANIC'
  | 'CUTTING_LEADER'
  | 'FINISHING_LEADER'
  | 'QC_LEADER'

// Bộ phận nhập sản lượng tương ứng với vị trí (dùng để rẽ nhánh màn nhập)
export type ProductionSection = 'LINE' | 'CUTTING' | 'FINISHING' | 'QC' | null

export interface AuthUser {
  id: number
  username: string
  employeeId: number
  fullName: string
  position: Position
  factoryId: number | null
  lineId: number | null
  roles: string[]
  permissions: string[]
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  // Actions
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: AuthUser) => void
  logout: () => void
  // Helpers
  hasRole: (role: string) => boolean
  hasPermission: (permission: string) => boolean
  isAdmin: () => boolean
  isCompanyLevel: () => boolean
  isFactoryLevel: () => boolean
  isLineLevel: () => boolean
  // Bộ phận nhập sản lượng của user (LINE/CUTTING/FINISHING/QC) hoặc null
  productionSection: () => ProductionSection
  // Là user "shop-floor" (chỉ thấy màn nhập sản lượng): tổ trưởng chuyền hoặc tổ cấp xưởng
  isShopFloor: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      setUser: (user) => set({ user }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),

      hasRole: (role) => get().user?.roles.includes(role) ?? false,

      hasPermission: (permission) =>
        get().user?.permissions.includes(permission) ??
        get().user?.roles.includes('ADMIN') ??
        false,

      isAdmin: () => get().user?.roles.includes('ADMIN') ?? false,

      isCompanyLevel: () => {
        const p = get().user?.position
        return p === 'ADMIN' || p === 'BOD' || p === 'COMPANY_PLANNER'
      },

      isFactoryLevel: () => {
        const p = get().user?.position
        return p === 'FACTORY_DIRECTOR' || p === 'FACTORY_PLANNER' || p === 'MECHANIC'
      },

      isLineLevel: () => {
        const p = get().user?.position
        return p === 'LINE_LEADER' || p === 'LINE_DEPUTY'
      },

      productionSection: () => {
        const p = get().user?.position
        if (p === 'LINE_LEADER' || p === 'LINE_DEPUTY') return 'LINE'
        if (p === 'CUTTING_LEADER') return 'CUTTING'
        if (p === 'FINISHING_LEADER') return 'FINISHING'
        if (p === 'QC_LEADER') return 'QC'
        return null
      },

      isShopFloor: () => {
        const p = get().user?.position
        return (
          p === 'LINE_LEADER' ||
          p === 'LINE_DEPUTY' ||
          p === 'CUTTING_LEADER' ||
          p === 'FINISHING_LEADER' ||
          p === 'QC_LEADER'
        )
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Chỉ persist token — user được fetch lại từ /auth/me khi app mount
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
