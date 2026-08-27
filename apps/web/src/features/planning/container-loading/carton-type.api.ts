import api from '@/lib/axios'

export interface CartonType {
  id: number
  customerId: number
  label: string
  length: number
  width: number
  height: number
  createdAt: string
}

export type CreateCartonTypeDto = {
  customerId: number
  label: string
  length: number
  width: number
  height: number
}

export type UpdateCartonTypeDto = Partial<Omit<CreateCartonTypeDto, 'customerId'>>

export const cartonTypeApi = {
  listByCustomer: (customerId: number) =>
    api.get<CartonType[]>('/plan/carton-types', { params: { customerId } }).then((r) => r.data),

  create: (dto: CreateCartonTypeDto) =>
    api.post<CartonType>('/plan/carton-types', dto).then((r) => r.data),

  update: (id: number, dto: UpdateCartonTypeDto) =>
    api.patch<CartonType>(`/plan/carton-types/${id}`, dto).then((r) => r.data),

  delete: (id: number) =>
    api.delete(`/plan/carton-types/${id}`).then((r) => r.data),
}
