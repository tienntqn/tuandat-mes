import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto'
import type { RequestUser } from '../../common/types/request-user.type'
import { EmployeePosition } from '@prisma/client'

const FACTORY_POSITIONS: EmployeePosition[] = [
  EmployeePosition.FACTORY_DIRECTOR,
  EmployeePosition.FACTORY_PLANNER,
  EmployeePosition.MECHANIC,
  EmployeePosition.CUTTING_LEADER,
  EmployeePosition.FINISHING_LEADER,
  EmployeePosition.QC_LEADER,
]
const LINE_POSITIONS: EmployeePosition[] = [EmployeePosition.LINE_LEADER, EmployeePosition.LINE_DEPUTY]

@Injectable()
export class EmployeeService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    user: RequestUser,
    search?: string,
    factoryId?: number,
    position?: string,
    page = 1,
    pageSize = 20,
  ) {
    const where: any = { deletedAt: null }

    if (user.dataScope.type === 'FACTORY' && user.dataScope.factoryId) {
      where.factoryId = user.dataScope.factoryId
    } else if (user.dataScope.type === 'LINE' && user.dataScope.lineId) {
      where.lineId = user.dataScope.lineId
    } else {
      if (factoryId) where.factoryId = factoryId
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ]
    }
    if (position) where.position = position

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          factory: { select: { id: true, code: true, name: true } },
          line: { select: { id: true, lineNumber: true, name: true } },
          user: { select: { id: true, username: true, isActive: true } },
        },
        orderBy: { code: 'asc' },
      }),
      this.prisma.employee.count({ where }),
    ])

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: number) {
    const emp = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: {
        factory: { select: { id: true, code: true, name: true } },
        line: { select: { id: true, lineNumber: true, name: true } },
        user: { select: { id: true, username: true, isActive: true } },
      },
    })
    if (!emp) throw new NotFoundException('Nhân viên không tồn tại')
    return emp
  }

  private async generateEmployeeCode(): Promise<string> {
    let seq = (await this.prisma.employee.count()) + 1
    let code = `NV${String(seq).padStart(4, '0')}`
    while (await this.prisma.employee.findFirst({ where: { code } })) {
      seq++
      code = `NV${String(seq).padStart(4, '0')}`
    }
    return code
  }

  async create(dto: CreateEmployeeDto) {
    const code = dto.code ?? (await this.generateEmployeeCode())

    const existing = await this.prisma.employee.findFirst({ where: { code } })
    if (existing) throw new ConflictException('Mã nhân viên đã tồn tại')

    await this.validatePositionScope(dto.position, dto.factoryId, dto.lineId)

    // Nếu là LINE position, lấy factoryId từ chuyền
    let resolvedFactoryId = dto.factoryId
    if (LINE_POSITIONS.includes(dto.position) && dto.lineId) {
      const line = await this.prisma.productionLine.findFirst({
        where: { id: dto.lineId, deletedAt: null },
      })
      if (!line) throw new NotFoundException('Chuyền không tồn tại')
      resolvedFactoryId = line.factoryId
    }

    return this.prisma.employee.create({
      data: {
        ...dto,
        code,
        factoryId: resolvedFactoryId ?? null,
        lineId: dto.lineId ?? null,
      },
    })
  }

  async update(id: number, dto: UpdateEmployeeDto) {
    const emp = await this.findOne(id)

    if (dto.code && dto.code !== emp.code) {
      const exists = await this.prisma.employee.findFirst({ where: { code: dto.code } })
      if (exists) throw new ConflictException('Mã nhân viên đã tồn tại')
    }

    const position = dto.position ?? emp.position
    const factoryId = 'factoryId' in dto ? dto.factoryId : emp.factoryId ?? undefined
    const lineId = 'lineId' in dto ? dto.lineId : emp.lineId ?? undefined

    await this.validatePositionScope(position, factoryId, lineId)

    let resolvedFactoryId = factoryId
    if (LINE_POSITIONS.includes(position) && lineId) {
      const line = await this.prisma.productionLine.findFirst({
        where: { id: lineId, deletedAt: null },
      })
      if (!line) throw new NotFoundException('Chuyền không tồn tại')
      resolvedFactoryId = line.factoryId
    }

    return this.prisma.employee.update({
      where: { id },
      data: { ...dto, factoryId: resolvedFactoryId ?? null },
    })
  }

  async softDelete(id: number) {
    await this.findOne(id)
    await this.prisma.employee.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'Đã xóa nhân viên' }
  }

  async restore(id: number) {
    const emp = await this.prisma.employee.findFirst({ where: { id } })
    if (!emp) throw new NotFoundException('Nhân viên không tồn tại')
    await this.prisma.employee.update({ where: { id }, data: { deletedAt: null } })
    return { message: 'Đã khôi phục nhân viên' }
  }

  private async validatePositionScope(
    position: EmployeePosition,
    factoryId?: number,
    lineId?: number,
  ) {
    if (FACTORY_POSITIONS.includes(position) && !factoryId) {
      throw new BadRequestException('Chức vụ này cần chọn xưởng')
    }
    if (LINE_POSITIONS.includes(position) && !lineId) {
      throw new BadRequestException('Tổ trưởng/Tổ phó cần chọn chuyền')
    }
    if (factoryId) {
      const factory = await this.prisma.factory.findFirst({
        where: { id: factoryId, deletedAt: null },
      })
      if (!factory) throw new NotFoundException('Xưởng không tồn tại')
    }
  }
}
