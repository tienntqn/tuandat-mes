import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto'

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, customerId?: number, status?: string, page = 1, pageSize = 20) {
    const where: any = { deletedAt: null }
    if (customerId) where.customerId = customerId
    if (status) where.status = status
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          customer: { select: { id: true, code: true, name: true } },
          _count: { select: { purchaseOrders: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ])

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async active() {
    return this.prisma.order.findMany({
      where: { deletedAt: null, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      select: { id: true, orderNumber: true, customerId: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: { select: { id: true, code: true, name: true } },
        purchaseOrders: {
          where: { deletedAt: null },
          include: { style: { select: { id: true, code: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại')
    return order
  }

  // Tự sinh số đơn hàng dạng ĐH-YYYY-NNN
  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `ĐH-${year}-`
    let seq = (await this.prisma.order.count()) + 1
    let code = `${prefix}${String(seq).padStart(3, '0')}`
    while (await this.prisma.order.findFirst({ where: { orderNumber: code } })) {
      seq++
      code = `${prefix}${String(seq).padStart(3, '0')}`
    }
    return code
  }

  async create(dto: CreateOrderDto) {
    const orderNumber = dto.orderNumber ?? (await this.generateOrderNumber())

    const existing = await this.prisma.order.findFirst({ where: { orderNumber } })
    if (existing) throw new ConflictException('Số đơn hàng đã tồn tại')

    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, deletedAt: null },
    })
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại')

    return this.prisma.order.create({
      data: {
        orderNumber,
        customerId: dto.customerId,
        orderDate: new Date(dto.orderDate),
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
        status: dto.status,
        note: dto.note,
      },
    })
  }

  async update(id: number, dto: UpdateOrderDto) {
    const order = await this.findOne(id)

    if (dto.orderNumber && dto.orderNumber !== order.orderNumber) {
      const exists = await this.prisma.order.findFirst({ where: { orderNumber: dto.orderNumber } })
      if (exists) throw new ConflictException('Số đơn hàng đã tồn tại')
    }

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, deletedAt: null },
      })
      if (!customer) throw new NotFoundException('Khách hàng không tồn tại')
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        orderNumber: dto.orderNumber,
        customerId: dto.customerId,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
        deliveryDate:
          dto.deliveryDate === undefined ? undefined : dto.deliveryDate ? new Date(dto.deliveryDate) : null,
        status: dto.status,
        note: dto.note,
      },
    })
  }

  async softDelete(id: number) {
    await this.findOne(id)
    await this.prisma.order.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'Đã xóa đơn hàng' }
  }

  async restore(id: number) {
    const order = await this.prisma.order.findFirst({ where: { id } })
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại')
    await this.prisma.order.update({ where: { id }, data: { deletedAt: null } })
    return { message: 'Đã khôi phục đơn hàng' }
  }
}
