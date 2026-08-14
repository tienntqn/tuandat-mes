import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { StockService } from '../stock/stock.service'
import {
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  CompleteWorkOrderDto,
  WorkOrderPartInput,
} from './dto/work-order.dto'
import { generateDocumentNo } from '../../common/utils/document-no.util'
import { assertFactoryAccess } from '../../common/utils/data-scope.util'
import { changeMachineStatus } from '../../common/utils/machine-status.util'
import type { RequestUser } from '../../common/types/request-user.type'

const WORK_ORDER_INCLUDE = {
  machine: {
    select: {
      id: true, code: true, name: true, model: true, serialNo: true,
      brandRef: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      line: { select: { id: true, name: true } },
    },
  },
  factory: { select: { id: true, code: true, name: true } },
  breakdownReport: { select: { id: true, reportNo: true, symptom: true, severity: true } },
  maintenanceRequest: { select: { id: true, requestNo: true, reason: true } },
  planItem: {
    select: {
      id: true, plannedDate: true, content: true,
      plan: { select: { id: true, planNo: true, title: true } },
    },
  },
  parts: { include: { sparePart: { select: { id: true, code: true, name: true, unit: true } } } },
  handover: { select: { id: true, handoverNo: true, status: true } },
}

@Injectable()
export class WorkOrderService {
  constructor(
    private prisma: PrismaService,
    private stock: StockService,
  ) {}

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
        { orderNo: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { machine: { code: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: WORK_ORDER_INCLUDE,
      }),
      this.prisma.workOrder.count({ where }),
    ])
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: number) {
    const order = await this.prisma.workOrder.findUnique({ where: { id }, include: WORK_ORDER_INCLUDE })
    if (!order) throw new NotFoundException('Phiếu công việc không tồn tại')
    return order
  }

  private mapParts(parts: WorkOrderPartInput[]) {
    return parts.map((p) => ({
      sparePartId: p.sparePartId ?? null,
      name: p.name,
      unit: p.unit ?? null,
      quantity: p.quantity,
      unitPrice: p.unitPrice ?? null,
      amount: p.unitPrice != null ? p.unitPrice * p.quantity : null,
      fromStock: p.fromStock ?? true,
      note: p.note ?? null,
    }))
  }

  async create(user: RequestUser, dto: CreateWorkOrderDto) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: dto.machineId, deletedAt: null },
      select: { id: true, factoryId: true },
    })
    if (!machine) throw new NotFoundException('Máy không tồn tại')
    assertFactoryAccess(user, machine.factoryId, 'Máy không thuộc xưởng của bạn')

    await this.validateSources(dto.machineId, dto.breakdownReportId, dto.maintenanceRequestId, dto.planItemId)

    // Số phiếu phân biệt sửa chữa (PSC) và bảo dưỡng (PBD)
    const prefix = dto.type === 'REPAIR' ? 'PSC' : 'PBD'
    const orderNo = await generateDocumentNo(prefix, async (no) => {
      const found = await this.prisma.workOrder.findUnique({ where: { orderNo: no } })
      return !!found
    })

    const created = await this.prisma.workOrder.create({
      data: {
        orderNo,
        type: dto.type,
        machineId: dto.machineId,
        factoryId: machine.factoryId,
        breakdownReportId: dto.breakdownReportId ?? null,
        maintenanceRequestId: dto.maintenanceRequestId ?? null,
        planItemId: dto.planItemId ?? null,
        content: dto.content,
        performedBy: dto.performedBy ?? user.employeeId,
        assistants: dto.assistants ?? null,
        findings: dto.findings ?? null,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : null,
        note: dto.note ?? null,
        createdBy: user.employeeId,
        parts: dto.parts?.length ? { create: this.mapParts(dto.parts) } : undefined,
      },
    })
    return this.findOne(created.id)
  }

  /** Kiểm tra nguồn phát sinh công việc thuộc đúng máy và chưa bị dùng cho phiếu khác. */
  private async validateSources(
    machineId: number,
    breakdownReportId?: number,
    maintenanceRequestId?: number,
    planItemId?: number,
  ) {
    if (breakdownReportId) {
      const breakdown = await this.prisma.breakdownReport.findUnique({ where: { id: breakdownReportId } })
      if (!breakdown) throw new NotFoundException('Phiếu báo hỏng không tồn tại')
      if (breakdown.machineId !== machineId) throw new BadRequestException('Phiếu báo hỏng không thuộc máy này')
    }
    if (maintenanceRequestId) {
      const request = await this.prisma.maintenanceRequest.findUnique({ where: { id: maintenanceRequestId } })
      if (!request) throw new NotFoundException('Phiếu yêu cầu bảo dưỡng không tồn tại')
      if (request.machineId !== machineId) throw new BadRequestException('Phiếu yêu cầu không thuộc máy này')
    }
    if (planItemId) {
      const item = await this.prisma.workPlanItem.findUnique({
        where: { id: planItemId },
        include: { workOrder: { select: { id: true } } },
      })
      if (!item) throw new NotFoundException('Dòng kế hoạch không tồn tại')
      if (item.machineId !== machineId) throw new BadRequestException('Dòng kế hoạch không thuộc máy này')
      if (item.workOrder) throw new BadRequestException('Dòng kế hoạch này đã có phiếu thực hiện')
    }
  }

  async update(id: number, user: RequestUser, dto: UpdateWorkOrderDto) {
    const order = await this.findOne(id)
    assertFactoryAccess(user, order.factoryId, 'Phiếu không thuộc xưởng của bạn')
    if (order.status === 'DONE' || order.status === 'HANDED_OVER' || order.status === 'CANCELLED') {
      throw new BadRequestException('Phiếu đã kết thúc, không sửa được')
    }

    await this.prisma.workOrder.update({
      where: { id },
      data: {
        ...(dto.content && { content: dto.content }),
        ...(dto.performedBy !== undefined && { performedBy: dto.performedBy ?? order.performedBy }),
        ...(dto.assistants !== undefined && { assistants: dto.assistants ?? null }),
        ...(dto.findings !== undefined && { findings: dto.findings ?? null }),
        ...(dto.startedAt !== undefined && { startedAt: dto.startedAt ? new Date(dto.startedAt) : null }),
        ...(dto.note !== undefined && { note: dto.note ?? null }),
      },
    })

    if (dto.parts !== undefined) {
      await this.prisma.workOrderPart.deleteMany({ where: { workOrderId: id } })
      if (dto.parts.length > 0) {
        await this.prisma.workOrderPart.createMany({
          data: this.mapParts(dto.parts).map((p) => ({ ...p, workOrderId: id })),
        })
      }
    }

    return this.findOne(id)
  }

  /** Bắt đầu thực hiện — máy chuyển sang trạng thái đang bảo dưỡng/sửa chữa. */
  async start(id: number, user: RequestUser) {
    const order = await this.findOne(id)
    assertFactoryAccess(user, order.factoryId, 'Phiếu không thuộc xưởng của bạn')
    if (order.status !== 'DRAFT') throw new BadRequestException('Phiếu đã bắt đầu hoặc đã kết thúc')

    await this.prisma.$transaction(async (tx) => {
      await tx.workOrder.update({
        where: { id },
        data: { status: 'IN_PROGRESS', startedAt: order.startedAt ?? new Date() },
      })
      await changeMachineStatus(tx, order.machineId, 'MAINTENANCE', {
        reason: `Bắt đầu ${order.type === 'REPAIR' ? 'sửa chữa' : 'bảo dưỡng'} theo phiếu ${order.orderNo}`,
        refType: 'WORK_ORDER',
        refId: order.id,
        changedBy: user.employeeId,
      })
      // Phiếu sửa chữa gắn với báo hỏng thì đánh dấu báo hỏng đang được xử lý
      if (order.breakdownReportId) {
        await tx.breakdownReport.update({
          where: { id: order.breakdownReportId },
          data: { status: 'IN_REPAIR' },
        })
      }
    })

    return this.findOne(id)
  }

  /**
   * Hoàn thành phiếu: chốt vật tư, trừ kho, tính chi phí và đóng nguồn phát sinh.
   * Máy chưa về RUNNING ngay — chỉ khi bên nhận ký biên bản bàn giao.
   */
  async complete(id: number, user: RequestUser, dto: CompleteWorkOrderDto) {
    const order = await this.findOne(id)
    assertFactoryAccess(user, order.factoryId, 'Phiếu không thuộc xưởng của bạn')
    if (order.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Chỉ hoàn thành được phiếu đang thực hiện')
    }

    await this.prisma.$transaction(async (tx) => {
      // Chốt lại danh sách vật tư nếu người dùng sửa ở bước hoàn thành
      if (dto.parts !== undefined) {
        await tx.workOrderPart.deleteMany({ where: { workOrderId: id } })
        if (dto.parts.length > 0) {
          await tx.workOrderPart.createMany({
            data: this.mapParts(dto.parts).map((p) => ({ ...p, workOrderId: id })),
          })
        }
      }

      const parts = await tx.workOrderPart.findMany({ where: { workOrderId: id } })

      // Xuất kho các vật tư lấy từ kho xưởng (chỉ những dòng chọn được phụ tùng trong danh mục)
      for (const part of parts) {
        if (!part.fromStock || !part.sparePartId) continue
        await this.stock.applyMovement(tx, 'OUT', {
          sparePartId: part.sparePartId,
          factoryId: order.factoryId,
          quantity: Number(part.quantity),
          unitPrice: part.unitPrice != null ? Number(part.unitPrice) : null,
          workOrderId: id,
          reason: `Xuất dùng cho phiếu ${order.orderNo}`,
          performedBy: user.employeeId,
        })
      }

      const partsCost = parts.reduce((sum, p) => sum + (p.amount != null ? Number(p.amount) : 0), 0)
      const laborCost = dto.laborCost ?? 0

      await tx.workOrder.update({
        where: { id },
        data: {
          status: 'DONE',
          result: dto.result,
          finishedAt: dto.finishedAt ? new Date(dto.finishedAt) : new Date(),
          downtimeHours: dto.downtimeHours ?? null,
          laborCost: dto.laborCost ?? null,
          partsCost: new Prisma.Decimal(partsCost),
          totalCost: new Prisma.Decimal(partsCost + laborCost),
          nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : null,
          ...(dto.note !== undefined && { note: dto.note ?? null }),
        },
      })

      // Ghi vào lịch sử bảo dưỡng để màn hình bảo dưỡng và cảnh báo đến hạn dùng chung dữ liệu
      await tx.machineMaintenance.create({
        data: {
          machineId: order.machineId,
          maintenanceDate: dto.finishedAt ? new Date(dto.finishedAt) : new Date(),
          type: order.type === 'REPAIR' ? 'REPAIR' : 'PERIODIC',
          description: `${order.orderNo}: ${order.content}`,
          cost: new Prisma.Decimal(partsCost + laborCost),
          nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : null,
        },
      })

      // Đóng nguồn phát sinh công việc
      if (order.breakdownReportId) {
        await tx.breakdownReport.update({
          where: { id: order.breakdownReportId },
          data: { status: 'RESOLVED', resolvedAt: new Date() },
        })
      }
      if (order.maintenanceRequestId) {
        await tx.maintenanceRequest.update({
          where: { id: order.maintenanceRequestId },
          data: { status: 'DONE' },
        })
      }
    })

    return this.findOne(id)
  }

  async cancel(id: number, user: RequestUser) {
    const order = await this.findOne(id)
    assertFactoryAccess(user, order.factoryId, 'Phiếu không thuộc xưởng của bạn')
    if (order.status === 'DONE' || order.status === 'HANDED_OVER') {
      throw new BadRequestException('Phiếu đã hoàn thành, không hủy được')
    }

    await this.prisma.workOrder.update({ where: { id }, data: { status: 'CANCELLED' } })
    return this.findOne(id)
  }

  async remove(id: number, user: RequestUser) {
    const order = await this.findOne(id)
    assertFactoryAccess(user, order.factoryId, 'Phiếu không thuộc xưởng của bạn')
    if (order.status !== 'DRAFT') throw new BadRequestException('Chỉ xóa được phiếu ở trạng thái Nháp')

    await this.prisma.workOrderPart.deleteMany({ where: { workOrderId: id } })
    await this.prisma.workOrder.delete({ where: { id } })
    return { message: 'Đã xóa phiếu' }
  }
}
