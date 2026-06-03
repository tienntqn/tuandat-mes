import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateSizeDto, UpdateSizeDto } from './dto/size.dto'

@Injectable()
export class SizeService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string, page = 1, pageSize = 50) {
    const where: any = { deletedAt: null }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ]
    }
    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.size.findMany({ where, skip, take: pageSize, orderBy: { sortOrder: 'asc' } }),
      this.prisma.size.count({ where }),
    ])
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findAllActive() {
    return this.prisma.size.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' },
    })
  }

  async findOne(id: number) {
    const size = await this.prisma.size.findFirst({ where: { id, deletedAt: null } })
    if (!size) throw new NotFoundException('Size không tồn tại')
    return size
  }

  private async generateCode(): Promise<string> {
    let seq = (await this.prisma.size.count()) + 1
    let code = `SZ${String(seq).padStart(3, '0')}`
    while (await this.prisma.size.findFirst({ where: { code } })) {
      seq++
      code = `SZ${String(seq).padStart(3, '0')}`
    }
    return code
  }

  async create(dto: CreateSizeDto) {
    const code = dto.code ?? (await this.generateCode())
    const existing = await this.prisma.size.findFirst({ where: { code } })
    if (existing) throw new ConflictException('Mã size đã tồn tại')
    return this.prisma.size.create({ data: { ...dto, code } })
  }

  async update(id: number, dto: UpdateSizeDto) {
    const size = await this.findOne(id)
    if (dto.code && dto.code !== size.code) {
      const exists = await this.prisma.size.findFirst({ where: { code: dto.code } })
      if (exists) throw new ConflictException('Mã size đã tồn tại')
    }
    return this.prisma.size.update({ where: { id }, data: dto })
  }

  async softDelete(id: number) {
    await this.findOne(id)
    await this.prisma.size.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'Đã xóa size' }
  }

  async restore(id: number) {
    const s = await this.prisma.size.findFirst({ where: { id } })
    if (!s) throw new NotFoundException('Size không tồn tại')
    await this.prisma.size.update({ where: { id }, data: { deletedAt: null } })
    return { message: 'Đã khôi phục size' }
  }
}
