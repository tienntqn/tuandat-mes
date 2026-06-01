import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateProductionLineDto, UpdateProductionLineDto } from './dto/production-line.dto'
import type { RequestUser } from '../../common/types/request-user.type'

@Injectable()
export class ProductionLineService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    user: RequestUser,
    factoryId?: number,
    search?: string,
    page = 1,
    pageSize = 20,
  ) {
    const where: any = { deletedAt: null }

    // Lọc data scope: LINE scope chỉ thấy chuyền mình
    if (user.dataScope.type === 'LINE') {
      where.id = user.dataScope.lineId
    } else if (user.dataScope.type === 'FACTORY') {
      where.factoryId = user.dataScope.factoryId
    } else if (factoryId) {
      where.factoryId = factoryId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { factory: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.productionLine.findMany({
        where,
        skip,
        take: pageSize,
        include: { factory: { select: { id: true, code: true, name: true } } },
        orderBy: [{ factoryId: 'asc' }, { lineNumber: 'asc' }],
      }),
      this.prisma.productionLine.count({ where }),
    ])

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findAllByFactory(factoryId: number) {
    return this.prisma.productionLine.findMany({
      where: { factoryId, deletedAt: null },
      orderBy: { lineNumber: 'asc' },
    })
  }

  async findOne(id: number) {
    const line = await this.prisma.productionLine.findFirst({
      where: { id, deletedAt: null },
      include: { factory: { select: { id: true, code: true, name: true } } },
    })
    if (!line) throw new NotFoundException('Chuyền không tồn tại')
    return line
  }

  async create(dto: CreateProductionLineDto) {
    const factory = await this.prisma.factory.findFirst({
      where: { id: dto.factoryId, deletedAt: null },
    })
    if (!factory) throw new NotFoundException('Xưởng không tồn tại')

    const existing = await this.prisma.productionLine.findFirst({
      where: { factoryId: dto.factoryId, lineNumber: dto.lineNumber, deletedAt: null },
    })
    if (existing) throw new ConflictException('Số chuyền đã tồn tại trong xưởng này')

    return this.prisma.productionLine.create({ data: dto })
  }

  async update(id: number, dto: UpdateProductionLineDto) {
    const line = await this.findOne(id)

    if (dto.lineNumber && dto.lineNumber !== line.lineNumber) {
      const factoryId = dto.factoryId ?? line.factoryId
      const exists = await this.prisma.productionLine.findFirst({
        where: { factoryId, lineNumber: dto.lineNumber, deletedAt: null, NOT: { id } },
      })
      if (exists) throw new ConflictException('Số chuyền đã tồn tại trong xưởng này')
    }

    return this.prisma.productionLine.update({ where: { id }, data: dto })
  }

  async softDelete(id: number) {
    await this.findOne(id)
    await this.prisma.productionLine.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'Đã xóa chuyền' }
  }

  async restore(id: number) {
    const line = await this.prisma.productionLine.findFirst({ where: { id } })
    if (!line) throw new NotFoundException('Chuyền không tồn tại')
    await this.prisma.productionLine.update({ where: { id }, data: { deletedAt: null } })
    return { message: 'Đã khôi phục chuyền' }
  }
}
