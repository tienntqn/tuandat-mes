import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateMaintenanceNormDto, UpdateMaintenanceNormDto, NormItemInput } from './dto/maintenance-norm.dto'

@Injectable()
export class MaintenanceNormService {
  constructor(private prisma: PrismaService) {}

  async findAll(categoryId?: number, machineId?: number, search?: string, page = 1, pageSize = 20) {
    const where: any = { deletedAt: null }
    if (categoryId) where.categoryId = categoryId
    if (machineId) where.machineId = machineId
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ]
    }

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.maintenanceNorm.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { code: 'asc' },
        include: {
          category: { select: { id: true, code: true, name: true } },
          machine: { select: { id: true, code: true, name: true } },
          items: { include: { sparePart: { select: { id: true, code: true, name: true } } } },
        },
      }),
      this.prisma.maintenanceNorm.count({ where }),
    ])
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: number) {
    const norm = await this.prisma.maintenanceNorm.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: { select: { id: true, code: true, name: true } },
        machine: { select: { id: true, code: true, name: true } },
        items: { include: { sparePart: { select: { id: true, code: true, name: true, unit: true } } } },
      },
    })
    if (!norm) throw new NotFoundException('Định mức bảo dưỡng không tồn tại')
    return norm
  }

  /**
   * Tìm định mức áp dụng cho một máy: ưu tiên định mức khai riêng cho máy đó,
   * nếu không có thì lấy theo chủng loại máy. Dùng khi dự tính kế hoạch bảo dưỡng.
   */
  async resolveForMachine(machineId: number) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: machineId, deletedAt: null },
      select: { id: true, categoryId: true },
    })
    if (!machine) throw new NotFoundException('Máy không tồn tại')

    const own = await this.prisma.maintenanceNorm.findFirst({
      where: { machineId, isActive: true, deletedAt: null },
      include: { items: true },
      orderBy: { intervalDays: 'asc' },
    })
    if (own) return own

    if (!machine.categoryId) return null
    return this.prisma.maintenanceNorm.findFirst({
      where: { categoryId: machine.categoryId, machineId: null, isActive: true, deletedAt: null },
      include: { items: true },
      orderBy: { intervalDays: 'asc' },
    })
  }

  private async generateCode(): Promise<string> {
    let seq = (await this.prisma.maintenanceNorm.count()) + 1
    let code = `DM${String(seq).padStart(4, '0')}`
    while (await this.prisma.maintenanceNorm.findUnique({ where: { code } })) {
      seq++
      code = `DM${String(seq).padStart(4, '0')}`
    }
    return code
  }

  private mapItems(items: NormItemInput[]) {
    return items.map((it) => ({
      sparePartId: it.sparePartId ?? null,
      name: it.name,
      unit: it.unit ?? null,
      quantity: it.quantity,
      note: it.note ?? null,
    }))
  }

  private async validateTarget(categoryId?: number, machineId?: number) {
    // Định mức phải gắn với chủng loại máy hoặc một máy cụ thể, không được để trống cả hai
    if (!categoryId && !machineId) {
      throw new BadRequestException('Phải chọn chủng loại máy hoặc một máy cụ thể để áp định mức')
    }
    if (categoryId) {
      const category = await this.prisma.machineCategory.findFirst({ where: { id: categoryId, deletedAt: null } })
      if (!category) throw new NotFoundException('Chủng loại máy không tồn tại')
    }
    if (machineId) {
      const machine = await this.prisma.machine.findFirst({ where: { id: machineId, deletedAt: null } })
      if (!machine) throw new NotFoundException('Máy không tồn tại')
    }
  }

  async create(dto: CreateMaintenanceNormDto) {
    await this.validateTarget(dto.categoryId, dto.machineId)

    const code = dto.code ?? (await this.generateCode())
    const existing = await this.prisma.maintenanceNorm.findUnique({ where: { code } })
    if (existing) throw new ConflictException('Mã định mức đã tồn tại')

    const norm = await this.prisma.maintenanceNorm.create({
      data: {
        code,
        name: dto.name,
        categoryId: dto.categoryId ?? null,
        machineId: dto.machineId ?? null,
        intervalDays: dto.intervalDays,
        estimatedHours: dto.estimatedHours ?? null,
        estimatedCost: dto.estimatedCost ?? null,
        checklist: dto.checklist ?? null,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
        items: dto.items?.length ? { create: this.mapItems(dto.items) } : undefined,
      },
    })
    return this.findOne(norm.id)
  }

  async update(id: number, dto: UpdateMaintenanceNormDto) {
    const norm = await this.findOne(id)

    const nextCategoryId = dto.categoryId !== undefined ? dto.categoryId : norm.categoryId
    const nextMachineId = dto.machineId !== undefined ? dto.machineId : norm.machineId
    await this.validateTarget(nextCategoryId ?? undefined, nextMachineId ?? undefined)

    if (dto.code && dto.code !== norm.code) {
      const existing = await this.prisma.maintenanceNorm.findUnique({ where: { code: dto.code } })
      if (existing) throw new ConflictException('Mã định mức đã tồn tại')
    }

    await this.prisma.maintenanceNorm.update({
      where: { id },
      data: {
        ...(dto.code && { code: dto.code }),
        ...(dto.name && { name: dto.name }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId ?? null }),
        ...(dto.machineId !== undefined && { machineId: dto.machineId ?? null }),
        ...(dto.intervalDays !== undefined && { intervalDays: dto.intervalDays }),
        ...(dto.estimatedHours !== undefined && { estimatedHours: dto.estimatedHours ?? null }),
        ...(dto.estimatedCost !== undefined && { estimatedCost: dto.estimatedCost ?? null }),
        ...(dto.checklist !== undefined && { checklist: dto.checklist ?? null }),
        ...(dto.description !== undefined && { description: dto.description ?? null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    })

    if (dto.items !== undefined) {
      await this.prisma.maintenanceNormItem.deleteMany({ where: { normId: id } })
      if (dto.items.length > 0) {
        await this.prisma.maintenanceNormItem.createMany({
          data: this.mapItems(dto.items).map((it) => ({ ...it, normId: id })),
        })
      }
    }

    return this.findOne(id)
  }

  async remove(id: number) {
    await this.findOne(id)
    await this.prisma.maintenanceNorm.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'Đã xóa định mức bảo dưỡng' }
  }
}
