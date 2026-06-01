import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateFactoryDto, UpdateFactoryDto } from './dto/factory.dto'
import type { RequestUser } from '../../common/types/request-user.type'

@Injectable()
export class FactoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    user: RequestUser,
    search?: string,
    status?: string,
    page = 1,
    pageSize = 20,
  ) {
    const where: any = { deletedAt: null }

    // Lọc theo data scope
    if (user.dataScope.type === 'FACTORY') {
      where.id = user.dataScope.factoryId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (status) where.status = status

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.factory.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { code: 'asc' },
      }),
      this.prisma.factory.count({ where }),
    ])

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: number) {
    const factory = await this.prisma.factory.findFirst({
      where: { id, deletedAt: null },
      include: { productionLines: { where: { deletedAt: null }, orderBy: { lineNumber: 'asc' } } },
    })
    if (!factory) throw new NotFoundException('Xưởng không tồn tại')
    return factory
  }

  async create(dto: CreateFactoryDto) {
    const existing = await this.prisma.factory.findFirst({ where: { code: dto.code } })
    if (existing) throw new ConflictException('Mã xưởng đã tồn tại')

    const company = await this.prisma.company.findFirst({ where: { deletedAt: null } })
    if (!company) throw new NotFoundException('Chưa có thông tin công ty')

    return this.prisma.factory.create({
      data: { ...dto, companyId: company.id },
    })
  }

  async update(id: number, dto: UpdateFactoryDto) {
    const factory = await this.findOne(id)

    if (dto.code && dto.code !== factory.code) {
      const existing = await this.prisma.factory.findFirst({ where: { code: dto.code } })
      if (existing) throw new ConflictException('Mã xưởng đã tồn tại')
    }

    return this.prisma.factory.update({ where: { id }, data: dto })
  }

  async softDelete(id: number) {
    await this.findOne(id)
    await this.prisma.factory.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
    return { message: 'Đã xóa xưởng' }
  }

  async restore(id: number) {
    const factory = await this.prisma.factory.findFirst({ where: { id } })
    if (!factory) throw new NotFoundException('Xưởng không tồn tại')
    await this.prisma.factory.update({ where: { id }, data: { deletedAt: null } })
    return { message: 'Đã khôi phục xưởng' }
  }
}
