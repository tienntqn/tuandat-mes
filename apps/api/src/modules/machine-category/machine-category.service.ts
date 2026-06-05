import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateMachineCategoryDto, UpdateMachineCategoryDto } from './dto/machine-category.dto'

@Injectable()
export class MachineCategoryService {
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
      this.prisma.machineCategory.findMany({ where, skip, take: pageSize, orderBy: { name: 'asc' } }),
      this.prisma.machineCategory.count({ where }),
    ])
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findAllActive() {
    return this.prisma.machineCategory.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: number) {
    const row = await this.prisma.machineCategory.findFirst({ where: { id, deletedAt: null } })
    if (!row) throw new NotFoundException('Chủng loại không tồn tại')
    return row
  }

  private async generateCode(): Promise<string> {
    let seq = (await this.prisma.machineCategory.count()) + 1
    let code = `CL${String(seq).padStart(3, '0')}`
    while (await this.prisma.machineCategory.findFirst({ where: { code } })) {
      seq++
      code = `CL${String(seq).padStart(3, '0')}`
    }
    return code
  }

  async create(dto: CreateMachineCategoryDto) {
    const code = dto.code ?? (await this.generateCode())
    const existing = await this.prisma.machineCategory.findFirst({ where: { code } })
    if (existing) throw new ConflictException('Mã chủng loại đã tồn tại')
    return this.prisma.machineCategory.create({ data: { ...dto, code } })
  }

  async update(id: number, dto: UpdateMachineCategoryDto) {
    const row = await this.findOne(id)
    if (dto.code && dto.code !== row.code) {
      const exists = await this.prisma.machineCategory.findFirst({ where: { code: dto.code } })
      if (exists) throw new ConflictException('Mã chủng loại đã tồn tại')
    }
    return this.prisma.machineCategory.update({ where: { id }, data: dto })
  }

  async softDelete(id: number) {
    await this.findOne(id)
    await this.prisma.machineCategory.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'Đã xóa chủng loại' }
  }

  async restore(id: number) {
    const row = await this.prisma.machineCategory.findFirst({ where: { id } })
    if (!row) throw new NotFoundException('Chủng loại không tồn tại')
    await this.prisma.machineCategory.update({ where: { id }, data: { deletedAt: null } })
    return { message: 'Đã khôi phục chủng loại' }
  }
}
