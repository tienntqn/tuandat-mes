import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateHandoverDto, UpdateHandoverDto, RejectHandoverDto } from './dto/machine-handover.dto'
import { generateDocumentNo } from '../../common/utils/document-no.util'
import { assertFactoryAccess } from '../../common/utils/data-scope.util'
import { changeMachineStatus } from '../../common/utils/machine-status.util'
import type { RequestUser } from '../../common/types/request-user.type'

// Tiền tố số biên bản theo từng loại bàn giao
const NO_PREFIX: Record<string, string> = {
  RECEIVE: 'BBN', // biên bản bàn giao nhận máy
  AFTER_REPAIR: 'BBS', // biên bản bàn giao sau sửa chữa
  AFTER_MAINTENANCE: 'BBD', // biên bản bàn giao sau bảo dưỡng
}

const DETAIL_INCLUDE = {
  machine: {
    select: {
      id: true, code: true, name: true, model: true, serialNo: true,
      brandRef: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    },
  },
  factory: { select: { id: true, code: true, name: true } },
  line: { select: { id: true, name: true, lineNumber: true } },
  workOrder: { select: { id: true, orderNo: true, type: true, content: true, result: true } },
}

@Injectable()
export class MachineHandoverService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    user: RequestUser,
    type?: string,
    status?: string,
    machineId?: number,
    search?: string,
    page = 1,
    pageSize = 20,
  ) {
    const where: any = {}
    if (user.dataScope.type === 'FACTORY') {
      where.factoryId = user.dataScope.factoryId
    } else if (user.dataScope.type === 'LINE') {
      return { data: [], total: 0, page, pageSize, totalPages: 0 }
    }
    if (type) where.type = type
    if (status) where.status = status
    if (machineId) where.machineId = machineId
    if (search) {
      where.OR = [
        { handoverNo: { contains: search, mode: 'insensitive' } },
        { machine: { code: { contains: search, mode: 'insensitive' } } },
        { machine: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.machineHandover.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { handoverDate: 'desc' },
        include: DETAIL_INCLUDE,
      }),
      this.prisma.machineHandover.count({ where }),
    ])
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: number) {
    const handover = await this.prisma.machineHandover.findUnique({
      where: { id },
      include: DETAIL_INCLUDE,
    })
    if (!handover) throw new NotFoundException('Biên bản bàn giao không tồn tại')
    return handover
  }

  async create(user: RequestUser, dto: CreateHandoverDto) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: dto.machineId, deletedAt: null },
      select: { id: true, factoryId: true },
    })
    if (!machine) throw new NotFoundException('Máy không tồn tại')
    assertFactoryAccess(user, machine.factoryId, 'Máy không thuộc xưởng của bạn')

    if (dto.lineId) {
      const line = await this.prisma.productionLine.findFirst({
        where: { id: dto.lineId, factoryId: machine.factoryId, deletedAt: null },
      })
      if (!line) throw new BadRequestException('Chuyền không thuộc xưởng của máy')
    }

    // Biên bản sau sửa chữa/bảo dưỡng phải gắn với đúng một phiếu công việc chưa có biên bản
    if (dto.workOrderId) {
      const workOrder = await this.prisma.workOrder.findUnique({
        where: { id: dto.workOrderId },
        include: { handover: { select: { id: true } } },
      })
      if (!workOrder) throw new NotFoundException('Phiếu sửa chữa/bảo dưỡng không tồn tại')
      if (workOrder.machineId !== dto.machineId) {
        throw new BadRequestException('Phiếu công việc không thuộc máy này')
      }
      if (workOrder.handover) {
        throw new BadRequestException('Phiếu công việc này đã có biên bản bàn giao')
      }
    }

    const prefix = NO_PREFIX[dto.type] ?? 'BB'
    const handoverNo = await generateDocumentNo(prefix, async (no) => {
      const found = await this.prisma.machineHandover.findUnique({ where: { handoverNo: no } })
      return !!found
    })

    const created = await this.prisma.machineHandover.create({
      data: {
        handoverNo,
        type: dto.type,
        machineId: dto.machineId,
        factoryId: machine.factoryId,
        lineId: dto.lineId ?? null,
        workOrderId: dto.workOrderId ?? null,
        handoverDate: new Date(dto.handoverDate),
        fromParty: dto.fromParty ?? null,
        senderId: dto.senderId ?? null,
        receiverId: dto.receiverId ?? null,
        condition: dto.condition ?? null,
        accessories: dto.accessories ?? null,
        note: dto.note ?? null,
        createdBy: user.employeeId,
      },
    })
    return this.findOne(created.id)
  }

  async update(id: number, user: RequestUser, dto: UpdateHandoverDto) {
    const handover = await this.findOne(id)
    assertFactoryAccess(user, handover.factoryId, 'Biên bản không thuộc xưởng của bạn')
    if (handover.status !== 'DRAFT') {
      throw new BadRequestException('Chỉ sửa được biên bản ở trạng thái Nháp')
    }

    await this.prisma.machineHandover.update({
      where: { id },
      data: {
        ...(dto.lineId !== undefined && { lineId: dto.lineId ?? null }),
        ...(dto.workOrderId !== undefined && { workOrderId: dto.workOrderId ?? null }),
        ...(dto.handoverDate && { handoverDate: new Date(dto.handoverDate) }),
        ...(dto.fromParty !== undefined && { fromParty: dto.fromParty ?? null }),
        ...(dto.senderId !== undefined && { senderId: dto.senderId ?? null }),
        ...(dto.receiverId !== undefined && { receiverId: dto.receiverId ?? null }),
        ...(dto.condition !== undefined && { condition: dto.condition ?? null }),
        ...(dto.accessories !== undefined && { accessories: dto.accessories ?? null }),
        ...(dto.note !== undefined && { note: dto.note ?? null }),
      },
    })
    return this.findOne(id)
  }

  /** Bước 1: bên giao ký xác nhận → chuyển sang chờ bên nhận */
  async confirmSender(id: number, user: RequestUser) {
    const handover = await this.findOne(id)
    assertFactoryAccess(user, handover.factoryId, 'Biên bản không thuộc xưởng của bạn')
    if (handover.status !== 'DRAFT') {
      throw new BadRequestException('Biên bản đã được bên giao xác nhận')
    }

    await this.prisma.machineHandover.update({
      where: { id },
      data: {
        status: 'PENDING_RECEIVER',
        senderConfirmedAt: new Date(),
        senderId: handover.senderId ?? user.employeeId,
      },
    })
    return this.findOne(id)
  }

  /**
   * Bước 2: bên nhận ký xác nhận → biên bản hoàn tất.
   * Lúc này mới cập nhật máy: gán chuyền tiếp nhận và đưa máy về trạng thái hoạt động,
   * đồng thời đóng phiếu sửa chữa/bảo dưỡng (nếu có).
   */
  async confirmReceiver(id: number, user: RequestUser) {
    const handover = await this.findOne(id)
    assertFactoryAccess(user, handover.factoryId, 'Biên bản không thuộc xưởng của bạn')
    if (handover.status !== 'PENDING_RECEIVER') {
      throw new BadRequestException('Biên bản chưa được bên giao xác nhận hoặc đã hoàn tất')
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.machineHandover.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          receiverConfirmedAt: new Date(),
          receiverId: handover.receiverId ?? user.employeeId,
        },
      })

      // Bàn giao xong thì máy về chuyền tiếp nhận (nếu biên bản có chỉ định)
      if (handover.lineId) {
        await tx.machine.update({ where: { id: handover.machineId }, data: { lineId: handover.lineId } })
      }

      const reasonByType: Record<string, string> = {
        RECEIVE: `Nhận máy theo biên bản ${handover.handoverNo}`,
        AFTER_REPAIR: `Bàn giao sau sửa chữa ${handover.handoverNo}`,
        AFTER_MAINTENANCE: `Bàn giao sau bảo dưỡng ${handover.handoverNo}`,
      }
      await changeMachineStatus(tx, handover.machineId, 'RUNNING', {
        reason: reasonByType[handover.type],
        refType: 'HANDOVER',
        refId: handover.id,
        changedBy: user.employeeId,
      })

      if (handover.workOrderId) {
        await tx.workOrder.update({
          where: { id: handover.workOrderId },
          data: { status: 'HANDED_OVER' },
        })
      }
    })

    return this.findOne(id)
  }

  async reject(id: number, user: RequestUser, dto: RejectHandoverDto) {
    const handover = await this.findOne(id)
    assertFactoryAccess(user, handover.factoryId, 'Biên bản không thuộc xưởng của bạn')
    if (handover.status === 'COMPLETED') {
      throw new BadRequestException('Biên bản đã hoàn tất, không thể từ chối')
    }

    await this.prisma.machineHandover.update({
      where: { id },
      data: { status: 'REJECTED', rejectReason: dto.rejectReason },
    })
    return this.findOne(id)
  }

  async remove(id: number, user: RequestUser) {
    const handover = await this.findOne(id)
    assertFactoryAccess(user, handover.factoryId, 'Biên bản không thuộc xưởng của bạn')
    if (handover.status !== 'DRAFT') {
      throw new BadRequestException('Chỉ xóa được biên bản ở trạng thái Nháp')
    }
    await this.prisma.machineHandover.delete({ where: { id } })
    return { message: 'Đã xóa biên bản bàn giao' }
  }
}
