import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateDeliveryPlanDto, UpdateDeliveryPlanDto } from './dto/delivery-plan.dto'

@Injectable()
export class DeliveryPlanService {
  constructor(private prisma: PrismaService) {}

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
            style: { select: { id: true, code: true, name: true } },
          },
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

    return this.prisma.deliveryPlan.create({
      data: {
        poId: dto.poId,
        plannedDate: new Date(dto.plannedDate),
        plannedQuantity: dto.plannedQuantity,
        actualDate: dto.actualDate ? new Date(dto.actualDate) : null,
        actualQuantity: dto.actualQuantity,
        status: dto.status,
        note: dto.note,
      },
    })
  }

  async update(id: number, dto: UpdateDeliveryPlanDto) {
    await this.findOne(id)

    if (dto.poId) {
      const po = await this.prisma.purchaseOrder.findFirst({
        where: { id: dto.poId, deletedAt: null },
      })
      if (!po) throw new NotFoundException('PO không tồn tại')
    }

    return this.prisma.deliveryPlan.update({
      where: { id },
      data: {
        poId: dto.poId,
        plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : undefined,
        plannedQuantity: dto.plannedQuantity,
        actualDate:
          dto.actualDate === undefined ? undefined : dto.actualDate ? new Date(dto.actualDate) : null,
        actualQuantity: dto.actualQuantity,
        status: dto.status,
        note: dto.note,
      },
    })
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
