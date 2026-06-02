import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateMachineDto, UpdateMachineDto, AssignLineDto } from './dto/machine.dto'
import type { RequestUser } from '../../common/types/request-user.type'

@Injectable()
export class MachineService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    user: RequestUser,
    factoryId?: number,
    lineId?: number,
    status?: string,
    type?: string,
    search?: string,
    page = 1,
    pageSize = 20,
  ) {
    const where: any = { deletedAt: null }

    // Data scope: MECHANIC/FACTORY_DIRECTOR chỉ thấy máy trong xưởng mình
    if (user.dataScope.type === 'FACTORY') {
      where.factoryId = user.dataScope.factoryId
    } else if (user.dataScope.type === 'LINE') {
      // LINE scope không có quyền quản lý máy, trả về rỗng
      return { data: [], total: 0, page, pageSize, totalPages: 0 }
    }

    if (factoryId) where.factoryId = factoryId
    if (lineId !== undefined) where.lineId = lineId === 0 ? null : lineId
    if (status) where.status = status
    if (type) where.type = type
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ]
    }

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.machine.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { code: 'asc' },
        include: {
          factory: { select: { id: true, name: true, code: true } },
          line: { select: { id: true, name: true, lineNumber: true } },
          maintenances: {
            orderBy: { maintenanceDate: 'desc' },
            take: 1,
            select: { nextDueDate: true, maintenanceDate: true },
          },
        },
      }),
      this.prisma.machine.count({ where }),
    ])

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: number) {
    const machine = await this.prisma.machine.findFirst({
      where: { id, deletedAt: null },
      include: {
        factory: { select: { id: true, name: true, code: true } },
        line: { select: { id: true, name: true, lineNumber: true } },
        maintenances: { orderBy: { maintenanceDate: 'desc' }, take: 5 },
        transfers: {
          orderBy: { transferDate: 'desc' },
          take: 5,
          include: {
            fromFactory: { select: { id: true, name: true } },
            toFactory: { select: { id: true, name: true } },
          },
        },
      },
    })
    if (!machine) throw new NotFoundException('Máy không tồn tại')
    return machine
  }

  private async generateMachineCode(): Promise<string> {
    let seq = (await this.prisma.machine.count()) + 1
    let code = `MAY${String(seq).padStart(4, '0')}`
    while (await this.prisma.machine.findFirst({ where: { code } })) {
      seq++
      code = `MAY${String(seq).padStart(4, '0')}`
    }
    return code
  }

  async create(dto: CreateMachineDto) {
    const code = dto.code ?? (await this.generateMachineCode())

    const existing = await this.prisma.machine.findFirst({ where: { code } })
    if (existing) throw new ConflictException('Mã máy đã tồn tại')

    // Kiểm tra factory tồn tại
    const factory = await this.prisma.factory.findFirst({ where: { id: dto.factoryId, deletedAt: null } })
    if (!factory) throw new NotFoundException('Xưởng không tồn tại')

    // Nếu có lineId, kiểm tra chuyền thuộc xưởng đó
    if (dto.lineId) {
      const line = await this.prisma.productionLine.findFirst({
        where: { id: dto.lineId, factoryId: dto.factoryId, deletedAt: null },
      })
      if (!line) throw new BadRequestException('Chuyền không thuộc xưởng này')
    }

    return this.prisma.machine.create({
      data: {
        code,
        name: dto.name,
        type: dto.type,
        factoryId: dto.factoryId,
        lineId: dto.lineId ?? null,
        status: dto.status ?? 'IDLE',
        brand: dto.brand,
        model: dto.model,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        note: dto.note,
      },
      include: {
        factory: { select: { id: true, name: true } },
        line: { select: { id: true, name: true } },
      },
    })
  }

  async update(id: number, dto: UpdateMachineDto) {
    await this.findOne(id)

    if (dto.code) {
      const existing = await this.prisma.machine.findFirst({ where: { code: dto.code, id: { not: id } } })
      if (existing) throw new ConflictException('Mã máy đã tồn tại')
    }

    if (dto.lineId && dto.factoryId) {
      const line = await this.prisma.productionLine.findFirst({
        where: { id: dto.lineId, factoryId: dto.factoryId, deletedAt: null },
      })
      if (!line) throw new BadRequestException('Chuyền không thuộc xưởng này')
    }

    return this.prisma.machine.update({
      where: { id },
      data: {
        ...(dto.code && { code: dto.code }),
        ...(dto.name && { name: dto.name }),
        ...(dto.type && { type: dto.type }),
        ...(dto.status && { status: dto.status }),
        ...(dto.brand !== undefined && { brand: dto.brand }),
        ...(dto.model !== undefined && { model: dto.model }),
        ...(dto.note !== undefined && { note: dto.note }),
        ...(dto.purchaseDate !== undefined && { purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null }),
        ...(dto.lineId !== undefined && { lineId: dto.lineId }),
        ...(dto.factoryId && { factoryId: dto.factoryId }),
      },
      include: {
        factory: { select: { id: true, name: true } },
        line: { select: { id: true, name: true } },
      },
    })
  }

  async assignLine(id: number, dto: AssignLineDto) {
    const machine = await this.findOne(id)

    if (dto.lineId) {
      const line = await this.prisma.productionLine.findFirst({
        where: { id: dto.lineId, factoryId: machine.factoryId, deletedAt: null },
      })
      if (!line) throw new BadRequestException('Chuyền không thuộc xưởng của máy')
    }

    return this.prisma.machine.update({
      where: { id },
      data: { lineId: dto.lineId ?? null },
      include: {
        factory: { select: { id: true, name: true } },
        line: { select: { id: true, name: true } },
      },
    })
  }

  async softDelete(id: number) {
    await this.findOne(id)
    await this.prisma.machine.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'Đã xóa máy' }
  }

  // Lấy danh sách máy sắp/đã đến hạn bảo dưỡng (dùng cho dashboard cơ điện)
  async getMaintenanceDue(user: RequestUser, daysAhead = 7) {
    const where: any = { deletedAt: null }
    if (user.dataScope.type === 'FACTORY') {
      where.factoryId = user.dataScope.factoryId
    }

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + daysAhead)

    const machines = await this.prisma.machine.findMany({
      where,
      include: {
        factory: { select: { id: true, name: true } },
        line: { select: { id: true, name: true } },
        maintenances: {
          orderBy: { maintenanceDate: 'desc' },
          take: 1,
          select: { nextDueDate: true },
        },
      },
    })

    // Lọc máy có nextDueDate <= cutoff hoặc đã quá hạn
    return machines
      .filter((m) => {
        const last = m.maintenances[0]
        if (!last?.nextDueDate) return false
        return new Date(last.nextDueDate) <= cutoff
      })
      .map((m) => ({
        ...m,
        nextDueDate: m.maintenances[0]?.nextDueDate,
        isOverdue: m.maintenances[0]?.nextDueDate
          ? new Date(m.maintenances[0].nextDueDate) < new Date()
          : false,
      }))
  }
}
