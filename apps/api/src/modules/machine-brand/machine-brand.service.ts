import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateMachineBrandDto, UpdateMachineBrandDto } from './dto/machine-brand.dto'

@Injectable()
export class MachineBrandService {
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
      this.prisma.machineBrand.findMany({ where, skip, take: pageSize, orderBy: { name: 'asc' } }),
      this.prisma.machineBrand.count({ where }),
    ])
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findAllActive() {
    return this.prisma.machineBrand.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: number) {
    const row = await this.prisma.machineBrand.findFirst({ where: { id, deletedAt: null } })
    if (!row) throw new NotFoundException('Hãng không tồn tại')
    return row
  }

  private async generateCode(): Promise<string> {
    let seq = (await this.prisma.machineBrand.count()) + 1
    let code = `HSX${String(seq).padStart(3, '0')}`
    while (await this.prisma.machineBrand.findFirst({ where: { code } })) {
      seq++
      code = `HSX${String(seq).padStart(3, '0')}`
    }
    return code
  }

  async create(dto: CreateMachineBrandDto) {
    const code = dto.code ?? (await this.generateCode())
    const existing = await this.prisma.machineBrand.findFirst({ where: { code } })
    if (existing) throw new ConflictException('Mã hãng đã tồn tại')
    return this.prisma.machineBrand.create({ data: { ...dto, code } })
  }

  async update(id: number, dto: UpdateMachineBrandDto) {
    const row = await this.findOne(id)
    if (dto.code && dto.code !== row.code) {
      const exists = await this.prisma.machineBrand.findFirst({ where: { code: dto.code } })
      if (exists) throw new ConflictException('Mã hãng đã tồn tại')
    }
    return this.prisma.machineBrand.update({ where: { id }, data: dto })
  }

  async softDelete(id: number) {
    await this.findOne(id)
    await this.prisma.machineBrand.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'Đã xóa hãng' }
  }

  async restore(id: number) {
    const row = await this.prisma.machineBrand.findFirst({ where: { id } })
    if (!row) throw new NotFoundException('Hãng không tồn tại')
    await this.prisma.machineBrand.update({ where: { id }, data: { deletedAt: null } })
    return { message: 'Đã khôi phục hãng' }
  }
}
