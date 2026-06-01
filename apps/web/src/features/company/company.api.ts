import api from '@/lib/axios'

export interface Company {
  id: number
  name: string
  taxCode: string | null
  phone: string | null
  email: string | null
  address: string | null
  logo: string | null
  createdAt: string
  updatedAt: string
}

export type UpdateCompanyDto = Partial<Omit<Company, 'id' | 'createdAt' | 'updatedAt'>>

export const companyApi = {
  get: () => api.get<Company>('/company').then((r) => r.data),
  update: (dto: UpdateCompanyDto) => api.patch<Company>('/company', dto).then((r) => r.data),
}
