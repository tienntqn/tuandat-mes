import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {
  CreateMaintenanceRequestDto,
  UpdateMaintenanceRequestDto,
  RejectDto,
} from './dto/maintenance-plan.dto'
import { generateDocumentNo } from '../../common/utils/document-no.util'
import { assertFactoryAccess } from '../../common/utils/data-scope.util'
import type { RequestUser } from '../../common/types/request-user.type'

const REQUEST_INCLUDE = {
  machine: {
    select: {
      id: true, code: true, name: true, model: true, serialNo: true,
      category: { select: { id: true, name: true } },
      line: { select: { id: true, name: true } },
    },
  },
  factory: { select: { id: true, code: true, name: true } },
  workOrders: { select: { id: true, orderNo: true, status: true } },
}

/** Phiếu yêu cầu bảo dưỡng — bước đề nghị trước khi đưa vào kế hoạch bảo dưỡng. */
@Injectable()
export class MaintenanceRequestService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: RequestUser, status?: string, machineId?: number, search?: string, page = 1, pageSize = 20) {
    const where: any = {}
    if (user.dataScope.type === 'FACTORY') {
      where.factoryId = user.dataScope.factoryId
    } else if (user.dataScope.type === 'LINE') {
      return { data: [], total: 0, page, pageSize, totalPages: 0 }
    }
    if (status) where.status = status
    if (machineId) where.machineId = machineId
    if (search) {
      where.OR = [
        { requestNo: { contains: search, mode: 'insensitive' } },
        { reason: { contains: search, mode: 'insensitive' } },
        { machine: { code: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.maintenanceRequest.findMany({
        where, skip, take: pageSize,
        orderBy: { requestedAt: 'desc' },
        include: REQUEST_INCLUDE,
      }),
      this.prisma.maintenanceRequest.count({ where }),
    ])
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: number) {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id },
      include: REQUEST_INCLUDE,
    })
    if (!request) throw new NotFoundException('Phiếu yêu cầu bảo dưỡng không tồn tại')
    return request
  }

  async create(user: RequestUser, dto: CreateMaintenanceRequestDto) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: dto.machineId, deletedAt: null },
      select: { id: true, factoryId: true },
    })
    if (!machine) throw new NotFoundException('Máy không tồn tại')
    assertFactoryAccess(user, machine.factoryId, 'Máy không thuộc xưởng của bạn')

    const requestNo = await generateDocumentNo('YCB', async (no) => {
      const found = await this.prisma.maintenanceRequest.findUnique({ where: { requestNo: no } })
      return !!found
    })

    const created = await this.prisma.maintenanceRequest.create({
      data: {
        requestNo,
        machineId: dto.machineId,
        factoryId: machine.factoryId,
        requestedBy: user.employeeId,
        desiredDate: dto.desiredDate ? new Date(dto.desiredDate) : null,
        reason: dto.reason,
        note: dto.note ?? null,
      },
    })
    return this.findOne(created.id)
  }

  async update(id: number, user: RequestUser, dto: UpdateMaintenanceRequestDto) {
    const request = await this.findOne(id)
    assertFactoryAccess(user, request.factoryId, 'Phiếu không thuộc xưởng của bạn')
    if (request.status !== 'PENDING') throw new BadRequestException('Chỉ sửa được phiếu đang chờ tiếp nhận')

    await this.prisma.maintenanceRequest.update({
      where: { id },
      data: {
        ...(dto.reason && { reason: dto.reason }),
        ...(dto.desiredDate !== undefined && { desiredDate: dto.desiredDate ? new Date(dto.desiredDate) : null }),
        ...(dto.note !== undefined && { note: dto.note ?? null }),
      },
    })
    return this.findOne(id)
  }

  /** Cơ điện tiếp nhận yêu cầu. */
  async accept(id: number, user: RequestUser) {
    const request = await this.findOne(id)
    assertFactoryAccess(user, request.factoryId, 'Phiếu không thuộc xưởng của bạn')
    if (request.status !== 'PENDING') throw new BadRequestException('Phiếu đã được xử lý')

    await this.prisma.maintenanceRequest.update({
      where: { id },
      data: { status: 'ACCEPTED', handledBy: user.employeeId, handledAt: new Date() },
    })
    return this.findOne(id)
  }

  async reject(id: number, user: RequestUser, dto: RejectDto) {
    const request = await this.findOne(id)
    assertFactoryAccess(user, request.factoryId, 'Phiếu không thuộc xưởng của bạn')
    if (request.status !== 'PENDING' && request.status !== 'ACCEPTED') {
      throw new BadRequestException('Phiếu đã được xử lý')
    }

    await this.prisma.maintenanceRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectReason: dto.rejectReason,
        handledBy: user.employeeId,
        handledAt: new Date(),
      },
    })
    return this.findOne(id)
  }

  async remove(id: number, user: RequestUser) {
    const request = await this.findOne(id)
    assertFactoryAccess(user, request.factoryId, 'Phiếu không thuộc xưởng của bạn')
    if (request.status === 'DONE') throw new BadRequestException('Phiếu đã thực hiện, không xóa được')
    if (request.workOrders.length > 0) throw new BadRequestException('Phiếu đã có phiếu bảo dưỡng, không xóa được')

    await this.prisma.maintenanceRequest.delete({ where: { id } })
    return { message: 'Đã xóa phiếu yêu cầu' }
  }
}
