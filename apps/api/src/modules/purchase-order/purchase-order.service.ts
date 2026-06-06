import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto/purchase-order.dto'
import type { RequestUser } from '../../common/types/request-user.type'

@Injectable()
export class PurchaseOrderService {
  constructor(private prisma: PrismaService) {}

  // Chỉ BOD/ADMIN được nhập trợ giá; vai trò khác bỏ qua trường này
  private canEditSubsidy(user?: RequestUser): boolean {
    if (!user) return true
    return user.roles.includes('ADMIN') || user.roles.includes('BOD')
  }

  async findAll(search?: string, styleId?: number, status?: string, page = 1, pageSize = 20) {
    const where: any = { deletedAt: null }
    if (styleId) where.styleId = styleId
    if (status) where.status = status
    if (search) {
      where.OR = [
        { poNumber: { contains: search, mode: 'insensitive' } },
        { style: { code: { contains: search, mode: 'insensitive' } } },
        { style: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          style: {
            select: {
              id: true,
              code: true,
              name: true,
              customer: { select: { id: true, name: true } },
            },
          },
          order: { select: { id: true, orderNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ])

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: number) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        style: {
          include: { customer: { select: { id: true, code: true, name: true } } },
        },
        items: { include: { color: true, size: true } },
      },
    })
    if (!po) throw new NotFoundException('PO không tồn tại')
    return po
  }

  async create(dto: CreatePurchaseOrderDto, user?: RequestUser) {
    const existing = await this.prisma.purchaseOrder.findFirst({
      where: { poNumber: dto.poNumber },
    })
    if (existing) throw new ConflictException('Số PO đã tồn tại')

    const style = await this.prisma.style.findFirst({
      where: { id: dto.styleId, deletedAt: null },
    })
    if (!style) throw new NotFoundException('Mã hàng không tồn tại')

    const { items, ...poData } = dto
    if (!this.canEditSubsidy(user)) delete poData.subsidyPrice
    // Nếu có phân bổ ma trận màu×size: tổng SL PO = tổng các ô
    if (items && items.length > 0) {
      poData.totalQuantity = items.reduce((s, it) => s + (it.quantity || 0), 0)
    }

    const po = await this.prisma.purchaseOrder.create({ data: poData })
    await this.syncItems(po.id, items)
    return this.findOne(po.id)
  }

  // Đồng bộ phân bổ ma trận (xóa cũ, tạo các ô > 0)
  private async syncItems(poId: number, items?: { colorId: number; sizeId: number; quantity: number }[]) {
    if (!items) return
    await this.prisma.poItem.deleteMany({ where: { poId } })
    const rows = items.filter((it) => it.quantity > 0).map((it) => ({ poId, colorId: it.colorId, sizeId: it.sizeId, quantity: it.quantity }))
    if (rows.length) await this.prisma.poItem.createMany({ data: rows, skipDuplicates: true })
  }

  async update(id: number, dto: UpdatePurchaseOrderDto, user?: RequestUser) {
    const po = await this.findOne(id)

    if (dto.poNumber && dto.poNumber !== po.poNumber) {
      const exists = await this.prisma.purchaseOrder.findFirst({
        where: { poNumber: dto.poNumber },
      })
      if (exists) throw new ConflictException('Số PO đã tồn tại')
    }

    if (dto.styleId) {
      const style = await this.prisma.style.findFirst({
        where: { id: dto.styleId, deletedAt: null },
      })
      if (!style) throw new NotFoundException('Mã hàng không tồn tại')
    }

    const { items, ...poData } = dto
    if (!this.canEditSubsidy(user)) delete poData.subsidyPrice
    if (items && items.length > 0) {
      poData.totalQuantity = items.reduce((s, it) => s + (it.quantity || 0), 0)
    }
    await this.prisma.purchaseOrder.update({ where: { id }, data: poData })
    await this.syncItems(id, items)
    return this.findOne(id)
  }

  async softDelete(id: number) {
    await this.findOne(id)
    await this.prisma.purchaseOrder.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'Đã xóa PO' }
  }

  async restore(id: number) {
    const po = await this.prisma.purchaseOrder.findFirst({ where: { id } })
    if (!po) throw new NotFoundException('PO không tồn tại')
    await this.prisma.purchaseOrder.update({ where: { id }, data: { deletedAt: null } })
    return { message: 'Đã khôi phục PO' }
  }
}
