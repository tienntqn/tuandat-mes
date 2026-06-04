import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateDeliveryPlanDto, UpdateDeliveryPlanDto, DeliveryItemInput } from './dto/delivery-plan.dto'

@Injectable()
export class DeliveryPlanService {
  constructor(private prisma: PrismaService) {}

  // Ghi đè toàn bộ phiếu đóng gói (màu × size) của 1 lần giao
  private async syncItems(deliveryPlanId: number, items: DeliveryItemInput[]) {
    await this.prisma.deliveryItem.deleteMany({ where: { deliveryPlanId } })
    const valid = items.filter((it) => it.quantity > 0)
    if (valid.length > 0) {
      await this.prisma.deliveryItem.createMany({
        data: valid.map((it) => ({
          deliveryPlanId,
          colorId: it.colorId,
          sizeId: it.sizeId,
          quantity: it.quantity,
        })),
      })
    }
  }

  async findAll(poId?: number, status?: string, page = 1, pageSize = 20) {
    const where: any = { deletedAt: null }
    if (poId) where.poId = poId
    if (status) where.status = status

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.deliveryPlan.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          po: {
            select: {
              id: true,
              poNumber: true,
              totalQuantity: true,
              style: { select: { id: true, code: true, name: true } },
            },
          },
        },
        orderBy: { plannedDate: 'asc' },
      }),
      this.prisma.deliveryPlan.count({ where }),
    ])

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: number) {
    const plan = await this.prisma.deliveryPlan.findFirst({
      where: { id, deletedAt: null },
      include: {
        po: {
          select: {
            id: true,
            poNumber: true,
            totalQuantity: true,
            styleId: true,
            style: { select: { id: true, code: true, name: true } },
          },
        },
        items: {
          include: { color: true, size: true },
          orderBy: [{ colorId: 'asc' }, { sizeId: 'asc' }],
        },
      },
    })
    if (!plan) throw new NotFoundException('Kế hoạch giao hàng không tồn tại')
    return plan
  }

  async create(dto: CreateDeliveryPlanDto) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: dto.poId, deletedAt: null },
    })
    if (!po) throw new NotFoundException('PO không tồn tại')

    // Nếu có phiếu đóng gói màu × size thì SL thực giao = tổng các ô
    const itemsTotal = dto.items?.reduce((s, it) => s + (it.quantity || 0), 0)
    const actualQuantity = dto.items ? itemsTotal : dto.actualQuantity

    const plan = await this.prisma.deliveryPlan.create({
      data: {
        poId: dto.poId,
        plannedDate: new Date(dto.plannedDate),
        plannedQuantity: dto.plannedQuantity,
        actualDate: dto.actualDate ? new Date(dto.actualDate) : null,
        actualQuantity,
        status: dto.status,
        note: dto.note,
      },
    })
    if (dto.items) await this.syncItems(plan.id, dto.items)
    return this.findOne(plan.id)
  }

  async update(id: number, dto: UpdateDeliveryPlanDto) {
    await this.findOne(id)

    if (dto.poId) {
      const po = await this.prisma.purchaseOrder.findFirst({
        where: { id: dto.poId, deletedAt: null },
      })
      if (!po) throw new NotFoundException('PO không tồn tại')
    }

    // Nếu gửi kèm items → ghi đè phiếu đóng gói và lấy SL thực giao = tổng các ô
    const itemsTotal = dto.items?.reduce((s, it) => s + (it.quantity || 0), 0)
    const actualQuantity = dto.items ? itemsTotal : dto.actualQuantity

    await this.prisma.deliveryPlan.update({
      where: { id },
      data: {
        poId: dto.poId,
        plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : undefined,
        plannedQuantity: dto.plannedQuantity,
        actualDate:
          dto.actualDate === undefined ? undefined : dto.actualDate ? new Date(dto.actualDate) : null,
        actualQuantity,
        status: dto.status,
        note: dto.note,
      },
    })
    if (dto.items) await this.syncItems(id, dto.items)
    return this.findOne(id)
  }

  async softDelete(id: number) {
    await this.findOne(id)
    await this.prisma.deliveryPlan.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'Đã xóa kế hoạch giao hàng' }
  }

  async restore(id: number) {
    const plan = await this.prisma.deliveryPlan.findFirst({ where: { id } })
    if (!plan) throw new NotFoundException('Kế hoạch giao hàng không tồn tại')
    await this.prisma.deliveryPlan.update({ where: { id }, data: { deletedAt: null } })
    return { message: 'Đã khôi phục kế hoạch giao hàng' }
  }
}
