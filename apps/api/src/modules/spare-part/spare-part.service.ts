import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateSparePartDto, UpdateSparePartDto } from './dto/spare-part.dto'

@Injectable()
export class SparePartService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, page = 1, pageSize = 20) {
    const where: any = { deletedAt: null }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ]
    }
    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.sparePart.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: { category: { select: { id: true, name: true } } },
      }),
      this.prisma.sparePart.count({ where }),
    ])
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findAllActive() {
    return this.prisma.sparePart.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true, unit: true },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: number) {
    const row = await this.prisma.sparePart.findFirst({ where: { id, deletedAt: null } })
    if (!row) throw new NotFoundException('Phụ tùng không tồn tại')
    return row
  }

  private async generateCode(): Promise<string> {
    let seq = (await this.prisma.sparePart.count()) + 1
    let code = `PT${String(seq).padStart(3, '0')}`
    while (await this.prisma.sparePart.findFirst({ where: { code } })) {
      seq++
      code = `PT${String(seq).padStart(3, '0')}`
    }
    return code
  }

  async create(dto: CreateSparePartDto) {
    const code = dto.code ?? (await this.generateCode())
    const existing = await this.prisma.sparePart.findFirst({ where: { code } })
    if (existing) throw new ConflictException('Mã phụ tùng đã tồn tại')
    return this.prisma.sparePart.create({ data: { ...dto, code } })
  }

  async update(id: number, dto: UpdateSparePartDto) {
    const row = await this.findOne(id)
    if (dto.code && dto.code !== row.code) {
      const exists = await this.prisma.sparePart.findFirst({ where: { code: dto.code } })
      if (exists) throw new ConflictException('Mã phụ tùng đã tồn tại')
    }
    return this.prisma.sparePart.update({ where: { id }, data: dto })
  }

  async softDelete(id: number) {
    await this.findOne(id)
    await this.prisma.sparePart.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'Đã xóa phụ tùng' }
  }

  async restore(id: number) {
    const row = await this.prisma.sparePart.findFirst({ where: { id } })
    if (!row) throw new NotFoundException('Phụ tùng không tồn tại')
    await this.prisma.sparePart.update({ where: { id }, data: { deletedAt: null } })
    return { message: 'Đã khôi phục phụ tùng' }
  }
}
