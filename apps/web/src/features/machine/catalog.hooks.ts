import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import {
  brandApi,
  categoryApi,
  sparePartApi,
  type CreateBrandDto,
  type CreateCategoryDto,
  type CreateSparePartDto,
} from './catalog.api'

type Params = { search?: string; page?: number; pageSize?: number }

// ===== Hãng sản xuất =====
const BRAND = 'machine-brands'
export function useBrands(params?: Params) {
  return useQuery({ queryKey: [BRAND, params], queryFn: () => brandApi.list(params) })
}
export function useBrandsActive() {
  return useQuery({ queryKey: [BRAND, 'active'], queryFn: brandApi.active })
}
export function useCreateBrand() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (dto: CreateBrandDto) => brandApi.create(dto), onSuccess: () => { qc.invalidateQueries({ queryKey: [BRAND] }); toast.success('Đã tạo hãng') } })
}
export function useUpdateBrand() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateBrandDto> }) => brandApi.update(id, dto), onSuccess: () => { qc.invalidateQueries({ queryKey: [BRAND] }); toast.success('Đã cập nhật hãng') } })
}
export function useDeleteBrand() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => brandApi.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: [BRAND] }); toast.success('Đã xóa hãng') } })
}
export function useRestoreBrand() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => brandApi.restore(id), onSuccess: () => { qc.invalidateQueries({ queryKey: [BRAND] }); toast.success('Đã khôi phục hãng') } })
}

// ===== Chủng loại =====
const CAT = 'machine-categories'
export function useCategories(params?: Params) {
  return useQuery({ queryKey: [CAT, params], queryFn: () => categoryApi.list(params) })
}
export function useCategoriesActive() {
  return useQuery({ queryKey: [CAT, 'active'], queryFn: categoryApi.active })
}
export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (dto: CreateCategoryDto) => categoryApi.create(dto), onSuccess: () => { qc.invalidateQueries({ queryKey: [CAT] }); toast.success('Đã tạo chủng loại') } })
}
export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateCategoryDto> }) => categoryApi.update(id, dto), onSuccess: () => { qc.invalidateQueries({ queryKey: [CAT] }); toast.success('Đã cập nhật chủng loại') } })
}
export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => categoryApi.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: [CAT] }); toast.success('Đã xóa chủng loại') } })
}
export function useRestoreCategory() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => categoryApi.restore(id), onSuccess: () => { qc.invalidateQueries({ queryKey: [CAT] }); toast.success('Đã khôi phục chủng loại') } })
}

// ===== Phụ tùng =====
const SP = 'spare-parts'
export function useSpareParts(params?: Params) {
  return useQuery({ queryKey: [SP, params], queryFn: () => sparePartApi.list(params) })
}
export function useSparePartsActive() {
  return useQuery({ queryKey: [SP, 'active'], queryFn: sparePartApi.active })
}
export function useCreateSparePart() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (dto: CreateSparePartDto) => sparePartApi.create(dto), onSuccess: () => { qc.invalidateQueries({ queryKey: [SP] }); toast.success('Đã tạo phụ tùng') } })
}
export function useUpdateSparePart() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, dto }: { id: number; dto: Partial<CreateSparePartDto> }) => sparePartApi.update(id, dto), onSuccess: () => { qc.invalidateQueries({ queryKey: [SP] }); toast.success('Đã cập nhật phụ tùng') } })
}
export function useDeleteSparePart() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => sparePartApi.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: [SP] }); toast.success('Đã xóa phụ tùng') } })
}
export function useRestoreSparePart() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => sparePartApi.restore(id), onSuccess: () => { qc.invalidateQueries({ queryKey: [SP] }); toast.success('Đã khôi phục phụ tùng') } })
}
