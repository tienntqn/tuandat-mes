import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateStyleDto, UpdateStyleDto } from './dto/style.dto'

@Injectable()
export class StyleService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, customerId?: number, page = 1, pageSize = 20) {
    const where: any = { deletedAt: null }
    if (customerId) where.customerId = customerId
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.style.findMany({
        where,
        skip,
        take: pageSize,
        include: { customer: { select: { id: true, code: true, name: true } } },
        orderBy: { code: 'asc' },
      }),
      this.prisma.style.count({ where }),
    ])

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findAllActive() {
    return this.prisma.style.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        code: true,
        name: true,
        customer: { select: { id: true, name: true } },
      },
      orderBy: { code: 'asc' },
    })
  }

  async findOne(id: number) {
    const style = await this.prisma.style.findFirst({
      where: { id, deletedAt: null },
      include: { customer: { select: { id: true, code: true, name: true } } },
    })
    if (!style) throw new NotFoundException('Mã hàng không tồn tại')
    return style
  }

  private async generateStyleCode(): Promise<string> {
    let seq = (await this.prisma.style.count()) + 1
    let code = `MH${String(seq).padStart(4, '0')}`
    while (await this.prisma.style.findFirst({ where: { code } })) {
      seq++
      code = `MH${String(seq).padStart(4, '0')}`
    }
    return code
  }

  async create(dto: CreateStyleDto) {
    const code = dto.code ?? (await this.generateStyleCode())

    const existing = await this.prisma.style.findFirst({ where: { code } })
    if (existing) throw new ConflictException('Mã hàng đã tồn tại')

    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, deletedAt: null },
    })
    if (!customer) throw new NotFoundException('Khách hàng không tồn tại')

    return this.prisma.style.create({ data: { ...dto, code } })
  }

  async update(id: number, dto: UpdateStyleDto) {
    const style = await this.findOne(id)

    if (dto.code && dto.code !== style.code) {
      const exists = await this.prisma.style.findFirst({ where: { code: dto.code } })
      if (exists) throw new ConflictException('Mã hàng đã tồn tại')
    }
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, deletedAt: null },
      })
      if (!customer) throw new NotFoundException('Khách hàng không tồn tại')
    }

    return this.prisma.style.update({ where: { id }, data: dto })
  }

  async softDelete(id: number) {
    await this.findOne(id)
    await this.prisma.style.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'Đã xóa mã hàng' }
  }

  async restore(id: number) {
    const s = await this.prisma.style.findFirst({ where: { id } })
    if (!s) throw new NotFoundException('Mã hàng không tồn tại')
    await this.prisma.style.update({ where: { id }, data: { deletedAt: null } })
    return { message: 'Đã khôi phục mã hàng' }
  }
}
