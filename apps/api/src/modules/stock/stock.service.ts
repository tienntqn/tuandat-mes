import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { Prisma, StockMovementType } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { RequestUser } from '../../common/types/request-user.type'

type PrismaLike = Prisma.TransactionClient

export interface StockChangeInput {
  sparePartId: number
  factoryId: number
  quantity: number
  unitPrice?: number | null
  workOrderId?: number | null
  partRequestId?: number | null
  supplier?: string | null
  documentNo?: string | null
  reason?: string | null
  performedBy?: number | null
  note?: string | null
  movementDate?: Date
}

/**
 * Quản lý tồn kho phụ tùng theo từng xưởng.
 * Mọi thay đổi tồn kho đều phải ghi một dòng StockMovement (thẻ kho) để tra cứu được.
 */
@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  /** Lấy (hoặc tạo mới) bản ghi tồn kho của một phụ tùng tại một xưởng. */
  private async getOrCreateStock(tx: PrismaLike, sparePartId: number, factoryId: number) {
    const existing = await tx.sparePartStock.findUnique({
      where: { sparePartId_factoryId: { sparePartId, factoryId } },
    })
    if (existing) return existing
    return tx.sparePartStock.create({ data: { sparePartId, factoryId, quantity: 0 } })
  }

  /**
   * Ghi một biến động kho và cập nhật tồn.
   * IN: cộng tồn · OUT: trừ tồn (không cho âm) · ADJUST: đặt lại tồn theo số kiểm kê.
   */
  async applyMovement(tx: PrismaLike, type: StockMovementType, input: StockChangeInput) {
    if (input.quantity < 0) throw new BadRequestException('Số lượng không được âm')

    const stock = await this.getOrCreateStock(tx, input.sparePartId, input.factoryId)
    const current = Number(stock.quantity)

    let balanceAfter: number
    if (type === 'IN') {
      balanceAfter = current + input.quantity
    } else if (type === 'OUT') {
      if (input.quantity > current) {
        const part = await tx.sparePart.findUnique({ where: { id: input.sparePartId }, select: { name: true } })
        throw new BadRequestException(
          `Tồn kho không đủ cho "${part?.name ?? 'phụ tùng'}": còn ${current}, cần xuất ${input.quantity}`,
        )
      }
      balanceAfter = current - input.quantity
    } else {
      // Kiểm kê: quantity là số tồn thực tế đếm được
      balanceAfter = input.quantity
    }

    await tx.sparePartStock.update({
      where: { id: stock.id },
      data: { quantity: balanceAfter },
    })

    const amount = input.unitPrice != null ? input.unitPrice * input.quantity : null
    return tx.stockMovement.create({
      data: {
        sparePartId: input.sparePartId,
        factoryId: input.factoryId,
        type,
        quantity: input.quantity,
        unitPrice: input.unitPrice ?? null,
        amount,
        balanceAfter,
        movementDate: input.movementDate ?? new Date(),
        workOrderId: input.workOrderId ?? null,
        partRequestId: input.partRequestId ?? null,
        supplier: input.supplier ?? null,
        documentNo: input.documentNo ?? null,
        reason: input.reason ?? null,
        performedBy: input.performedBy ?? null,
        note: input.note ?? null,
      },
    })
  }

  /** Tồn kho hiện tại theo xưởng, kèm cảnh báo dưới định mức tối thiểu. */
  async findStocks(user: RequestUser, factoryId?: number, search?: string, belowMin?: boolean) {
    const where: any = {}
    if (user.dataScope.type === 'FACTORY') {
      where.factoryId = user.dataScope.factoryId
    } else if (user.dataScope.type === 'LINE') {
      return []
    } else if (factoryId) {
      where.factoryId = factoryId
    }
    if (search) {
      where.sparePart = {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      }
    }

    const stocks = await this.prisma.sparePartStock.findMany({
      where,
      orderBy: [{ factoryId: 'asc' }, { sparePartId: 'asc' }],
      include: {
        sparePart: { select: { id: true, code: true, name: true, unit: true } },
        factory: { select: { id: true, code: true, name: true } },
      },
    })

    const mapped = stocks.map((s) => ({
      ...s,
      quantity: Number(s.quantity),
      minQuantity: Number(s.minQuantity),
      isBelowMin: Number(s.minQuantity) > 0 && Number(s.quantity) < Number(s.minQuantity),
    }))
    return belowMin ? mapped.filter((s) => s.isBelowMin) : mapped
  }

  /** Thẻ kho: lịch sử biến động của phụ tùng tại một xưởng. */
  async findMovements(
    user: RequestUser,
    sparePartId?: number,
    factoryId?: number,
    type?: string,
    page = 1,
    pageSize = 20,
  ) {
    const where: any = {}
    if (user.dataScope.type === 'FACTORY') {
      where.factoryId = user.dataScope.factoryId
    } else if (user.dataScope.type === 'LINE') {
      return { data: [], total: 0, page, pageSize, totalPages: 0 }
    } else if (factoryId) {
      where.factoryId = factoryId
    }
    if (sparePartId) where.sparePartId = sparePartId
    if (type) where.type = type

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { movementDate: 'desc' },
        include: {
          sparePart: { select: { id: true, code: true, name: true, unit: true } },
          factory: { select: { id: true, name: true } },
          workOrder: { select: { id: true, orderNo: true, type: true } },
          partRequest: { select: { id: true, requestNo: true } },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ])
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  /** Nhập kho thủ công hoặc theo yêu cầu mua vật tư đã duyệt. */
  async receive(user: RequestUser, input: StockChangeInput) {
    await this.assertSparePart(input.sparePartId)
    return this.prisma.$transaction((tx) =>
      this.applyMovement(tx, 'IN', { ...input, performedBy: user.employeeId }),
    )
  }

  /** Điều chỉnh tồn sau kiểm kê. */
  async adjust(user: RequestUser, input: StockChangeInput) {
    await this.assertSparePart(input.sparePartId)
    return this.prisma.$transaction((tx) =>
      this.applyMovement(tx, 'ADJUST', { ...input, performedBy: user.employeeId }),
    )
  }

  /** Đặt định mức tồn tối thiểu để cảnh báo khi thiếu. */
  async setMinQuantity(sparePartId: number, factoryId: number, minQuantity: number, location?: string) {
    await this.assertSparePart(sparePartId)
    return this.prisma.sparePartStock.upsert({
      where: { sparePartId_factoryId: { sparePartId, factoryId } },
      create: { sparePartId, factoryId, quantity: 0, minQuantity, location: location ?? null },
      update: { minQuantity, ...(location !== undefined && { location: location ?? null }) },
    })
  }

  /** Tồn hiện tại của một phụ tùng tại một xưởng (0 nếu chưa có bản ghi). */
  async getQuantity(sparePartId: number, factoryId: number) {
    const stock = await this.prisma.sparePartStock.findUnique({
      where: { sparePartId_factoryId: { sparePartId, factoryId } },
    })
    return stock ? Number(stock.quantity) : 0
  }

  private async assertSparePart(sparePartId: number) {
    const part = await this.prisma.sparePart.findFirst({ where: { id: sparePartId, deletedAt: null } })
    if (!part) throw new NotFoundException('Phụ tùng không tồn tại')
  }
}
