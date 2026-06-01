import { apiClient } from '@/lib/axios'
import type { PaginatedResponse } from '@/types'

export interface UserListItem {
  id: number
  username: string
  isActive: boolean
  createdAt: string
  employee: {
    id: number
    code: string
    fullName: string
    position: string
    factoryId: number | null
    lineId: number | null
  }
  userRoles: Array<{ role: { id: number; name: string; description: string } }>
}

export interface RoleItem {
  id: number
  name: string
  description: string
}

export interface CreateUserPayload {
  employeeId: number
  username: string
  password: string
  roleIds?: number[]
}

export interface UpdateUserPayload {
  isActive?: boolean
  roleIds?: number[]
}

export const usersApi = {
  getAll: (page = 1, pageSize = 20) =>
    apiClient
      .get<PaginatedResponse<UserListItem>>('/users', { params: { page, pageSize } })
      .then((r) => r.data),

  getOne: (id: number) => apiClient.get<UserListItem>(`/users/${id}`).then((r) => r.data),

  getRoles: () => apiClient.get<RoleItem[]>('/users/roles').then((r) => r.data),

  create: (data: CreateUserPayload) =>
    apiClient.post<UserListItem>('/users', data).then((r) => r.data),

  update: (id: number, data: UpdateUserPayload) =>
    apiClient.patch<UserListItem>(`/users/${id}`, data).then((r) => r.data),

  resetPassword: (id: number, newPassword: string) =>
    apiClient
      .patch<{ message: string }>(`/users/${id}/reset-password`, { newPassword })
      .then((r) => r.data),
}
