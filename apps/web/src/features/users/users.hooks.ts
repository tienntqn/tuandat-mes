import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, type CreateUserPayload, type UpdateUserPayload } from './users.api'

export const userKeys = {
  all: ['users'] as const,
  list: (page: number) => [...userKeys.all, 'list', page] as const,
  roles: () => [...userKeys.all, 'roles'] as const,
}

export function useUsers(page = 1) {
  return useQuery({
    queryKey: userKeys.list(page),
    queryFn: () => usersApi.getAll(page),
  })
}

export function useRoles() {
  return useQuery({
    queryKey: userKeys.roles(),
    queryFn: usersApi.getRoles,
    staleTime: Infinity,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserPayload) => usersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserPayload }) =>
      usersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) =>
      usersApi.resetPassword(id, newPassword),
  })
}
