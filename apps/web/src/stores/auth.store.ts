import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole =
  | 'ADMIN'
  | 'BOD'
  | 'COMPANY_PLANNER'
  | 'FACTORY_DIRECTOR'
  | 'FACTORY_PLANNER'
  | 'LINE_LEADER'
  | 'LINE_DEPUTY'
  | 'MECHANIC'

export interface AuthUser {
  id: number
  username: string
  employeeId: number
  fullName: string
  position: UserRole
  factoryId: number | null
  lineId: number | null
  roles: string[]
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      // Chỉ persist token, không persist user (re-fetch khi mount)
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
