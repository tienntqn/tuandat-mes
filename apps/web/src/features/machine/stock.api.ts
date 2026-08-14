import api from '@/lib/axios'
import type { ListResult } from './catalog.api'

// ============================================================
// TỒN KHO PHỤ TÙNG THEO XƯỞNG (thẻ kho, nhập, kiểm kê)
// ============================================================

export type StockMovementType = 'IN' | 'OUT' | 'ADJUST'

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  IN: 'Nhập kho',
  OUT: 'Xuất dùng',
  ADJUST: 'Kiểm kê',
}

export interface SparePartStock {
  id: number
  sparePartId: number
  factoryId: number
  quantity: number
  minQuantity: number
  location: string | null
  isBelowMin: boolean
  updatedAt: string
  sparePart?: { id: number; code: string; name: string; unit: string | null }
  factory?: { id: number; code: string; name: string }
}

export interface StockMovement {
  id: number
  sparePartId: number
  factoryId: number
  type: StockMovementType
  quantity: number
  unitPrice: number | null
  amount: number | null
  balanceAfter: number
  movementDate: string
  workOrderId: number | null
  partRequestId: number | null
  supplier: string | null
  documentNo: string | null
  reason: string | null
  note: string | null
  sparePart?: { id: number; code: string; name: string; unit: string | null }
  factory?: { id: number; name: string }
  workOrder?: { id: number; orderNo: string; type: string } | null
  partRequest?: { id: number; requestNo: string } | null
}

export type ReceiveStockDto = {
  sparePartId: number
  factoryId: number
  quantity: number
  unitPrice?: number
  partRequestId?: number
  supplier?: string
  documentNo?: string
  movementDate?: string
  note?: string
}

export type AdjustStockDto = {
  sparePartId: number
  factoryId: number
  quantity: number
  reason: string
  note?: string
}

export const stockApi = {
  list: (params?: { factoryId?: number; search?: string; belowMin?: boolean }) =>
    api.get<SparePartStock[]>('/spare-part-stocks', { params }).then((r) => r.data),
  movements: (params?: { sparePartId?: number; factoryId?: number; type?: string; page?: number; pageSize?: number }) =>
    api.get<ListResult<StockMovement>>('/spare-part-stocks/movements', { params }).then((r) => r.data),
  receive: (dto: ReceiveStockDto) => api.post('/spare-part-stocks/receive', dto).then((r) => r.data),
  adjust: (dto: AdjustStockDto) => api.post('/spare-part-stocks/adjust', dto).then((r) => r.data),
  setMinQuantity: (dto: { sparePartId: number; factoryId: number; minQuantity: number; location?: string }) =>
    api.post('/spare-part-stocks/min-quantity', dto).then((r) => r.data),
}
