import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto'

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, page = 1, pageSize = 20) {
    const where: any = { deletedAt: null }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { country: { contains: search, mode: 'insensitive' } },
      ]
    }

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({ where, skip, take: pageSize, orderBy: { code: 'asc' } }),
      this.prisma.customer.count({ where }),
    ])

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findAllActive() {
    return this.prisma.customer.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: number) {
    const customer = await this.prisma.customer.findFirst({ where: { id, deletedAt: null } })
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại')
    return customer
  }

  async create(dto: CreateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({ where: { code: dto.code } })
    if (existing) throw new ConflictException('Mã khách hàng đã tồn tại')
    return this.prisma.customer.create({ data: dto })
  }

  async update(id: number, dto: UpdateCustomerDto) {
    const customer = await this.findOne(id)
    if (dto.code && dto.code !== customer.code) {
      const exists = await this.prisma.customer.findFirst({ where: { code: dto.code } })
      if (exists) throw new ConflictException('Mã khách hàng đã tồn tại')
    }
    return this.prisma.customer.update({ where: { id }, data: dto })
  }

  async softDelete(id: number) {
    await this.findOne(id)
    await this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'Đã xóa khách hàng' }
  }

  async restore(id: number) {
    const c = await this.prisma.customer.findFirst({ where: { id } })
    if (!c) throw new NotFoundException('Khách hàng không tồn tại')
    await this.prisma.customer.update({ where: { id }, data: { deletedAt: null } })
    return { message: 'Đã khôi phục khách hàng' }
  }
}
