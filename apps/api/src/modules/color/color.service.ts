import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateColorDto, UpdateColorDto } from './dto/color.dto'

@Injectable()
export class ColorService {
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
      this.prisma.color.findMany({ where, skip, take: pageSize, orderBy: { code: 'asc' } }),
      this.prisma.color.count({ where }),
    ])
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findAllActive() {
    return this.prisma.color.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true, hex: true },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: number) {
    const color = await this.prisma.color.findFirst({ where: { id, deletedAt: null } })
    if (!color) throw new NotFoundException('Màu không tồn tại')
    return color
  }

  private async generateCode(): Promise<string> {
    let seq = (await this.prisma.color.count()) + 1
    let code = `MAU${String(seq).padStart(3, '0')}`
    while (await this.prisma.color.findFirst({ where: { code } })) {
      seq++
      code = `MAU${String(seq).padStart(3, '0')}`
    }
    return code
  }

  async create(dto: CreateColorDto) {
    const code = dto.code ?? (await this.generateCode())
    const existing = await this.prisma.color.findFirst({ where: { code } })
    if (existing) throw new ConflictException('Mã màu đã tồn tại')
    return this.prisma.color.create({ data: { ...dto, code } })
  }

  async update(id: number, dto: UpdateColorDto) {
    const color = await this.findOne(id)
    if (dto.code && dto.code !== color.code) {
      const exists = await this.prisma.color.findFirst({ where: { code: dto.code } })
      if (exists) throw new ConflictException('Mã màu đã tồn tại')
    }
    return this.prisma.color.update({ where: { id }, data: dto })
  }

  async softDelete(id: number) {
    await this.findOne(id)
    await this.prisma.color.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'Đã xóa màu' }
  }

  async restore(id: number) {
    const c = await this.prisma.color.findFirst({ where: { id } })
    if (!c) throw new NotFoundException('Màu không tồn tại')
    await this.prisma.color.update({ where: { id }, data: { deletedAt: null } })
    return { message: 'Đã khôi phục màu' }
  }
}
