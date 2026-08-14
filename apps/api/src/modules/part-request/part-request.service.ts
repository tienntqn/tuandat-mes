import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { StockService } from '../stock/stock.service'
import { SettingsService, SETTING_KEYS } from '../settings/settings.service'
import {
  CreatePartRequestDto,
  UpdatePartRequestDto,
  RejectPartRequestDto,
  ReceivePartRequestDto,
  PartRequestItemInput,
} from './dto/part-request.dto'
import { generateDocumentNo } from '../../common/utils/document-no.util'
import { assertFactoryAccess } from '../../common/utils/data-scope.util'
import type { RequestUser } from '../../common/types/request-user.type'

/** Một dòng nhu cầu vật tư: cần bao nhiêu, tồn bao nhiêu, còn thiếu bao nhiêu. */
export interface NeedRow {
  sparePartId: number | null
  code: string | null
  name: string
  unit: string | null
  required: number
  machines: string[]
  inStock: number
  shortage: number
}

const REQUEST_INCLUDE = {
  factory: { select: { id: true, code: true, name: true } },
  workPlan: { select: { id: true, planNo: true, title: true } },
  workOrder: { select: { id: true, orderNo: true, content: true } },
  breakdownReport: { select: { id: true, reportNo: true, symptom: true } },
  items: { include: { sparePart: { select: { id: true, code: true, name: true, unit: true } } } },
}

/**
 * Yêu cầu mua vật tư sửa chữa / bảo dưỡng — duyệt 2 cấp (giám đốc xưởng rồi công ty),
 * sau khi duyệt thì nhập kho theo từng lần nhận hàng.
 */
@Injectable()
export class PartRequestService {
  constructor(
    private prisma: PrismaService,
    private stock: StockService,
    private settings: SettingsService,
  ) {}

  async findAll(
    user: RequestUser,
    type?: string,
    status?: string,
    factoryId?: number,
    search?: string,
    page = 1,
    pageSize = 20,
  ) {
    const where: any = {}
    if (user.dataScope.type === 'FACTORY') {
      where.factoryId = user.dataScope.factoryId
    } else if (user.dataScope.type === 'LINE') {
      return { data: [], total: 0, page, pageSize, totalPages: 0 }
    } else if (factoryId) {
      where.factoryId = factoryId
    }
    if (type) where.type = type
    if (status) where.status = status
    if (search) {
      where.OR = [
        { requestNo: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ]
    }

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.partRequest.findMany({
        where, skip, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: REQUEST_INCLUDE,
      }),
      this.prisma.partRequest.count({ where }),
    ])
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: number) {
    const request = await this.prisma.partRequest.findUnique({ where: { id }, include: REQUEST_INCLUDE })
    if (!request) throw new NotFoundException('Yêu cầu mua vật tư không tồn tại')
    return request
  }

  /** Gắn tồn kho hiện tại vào từng dòng để người duyệt biết còn hàng hay không. */
  private async mapItems(items: PartRequestItemInput[], factoryId: number) {
    const result: Prisma.PartRequestItemCreateManyRequestInput[] = []
    for (const it of items) {
      const stockQuantity = it.sparePartId
        ? await this.stock.getQuantity(it.sparePartId, factoryId)
        : null
      result.push({
        sparePartId: it.sparePartId ?? null,
        name: it.name,
        unit: it.unit ?? null,
        quantity: it.quantity,
        stockQuantity,
        estimatedPrice: it.estimatedPrice ?? null,
        amount: it.estimatedPrice != null ? it.estimatedPrice * it.quantity : null,
        note: it.note ?? null,
      })
    }
    return result
  }

  private sumAmount(items: Prisma.PartRequestItemCreateManyRequestInput[]) {
    return items.reduce((sum, i) => sum + (i.amount != null ? Number(i.amount) : 0), 0)
  }

  async create(user: RequestUser, dto: CreatePartRequestDto) {
    const factoryId = user.dataScope.type === 'FACTORY' ? user.dataScope.factoryId : dto.factoryId
    if (!factoryId) throw new BadRequestException('Phải chọn xưởng yêu cầu')
    assertFactoryAccess(user, factoryId)
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Yêu cầu phải có ít nhất một dòng vật tư')
    }

    const requestNo = await generateDocumentNo(dto.type === 'REPAIR' ? 'VSC' : 'VBD', async (no) => {
      const found = await this.prisma.partRequest.findUnique({ where: { requestNo: no } })
      return !!found
    })

    const items = await this.mapItems(dto.items, factoryId)

    const created = await this.prisma.partRequest.create({
      data: {
        requestNo,
        type: dto.type,
        factoryId,
        workPlanId: dto.workPlanId ?? null,
        workOrderId: dto.workOrderId ?? null,
        breakdownReportId: dto.breakdownReportId ?? null,
        title: dto.title,
        reason: dto.reason ?? null,
        requestDate: new Date(dto.requestDate),
        neededDate: dto.neededDate ? new Date(dto.neededDate) : null,
        totalAmount: new Prisma.Decimal(this.sumAmount(items)),
        requestedBy: user.employeeId,
        note: dto.note ?? null,
        items: { create: items },
      },
    })
    return this.findOne(created.id)
  }

  async update(id: number, user: RequestUser, dto: UpdatePartRequestDto) {
    const request = await this.findOne(id)
    assertFactoryAccess(user, request.factoryId, 'Yêu cầu không thuộc xưởng của bạn')
    if (request.status !== 'DRAFT' && request.status !== 'REJECTED') {
      throw new BadRequestException('Chỉ sửa được yêu cầu ở trạng thái Nháp hoặc bị từ chối')
    }

    await this.prisma.partRequest.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.reason !== undefined && { reason: dto.reason ?? null }),
        ...(dto.requestDate && { requestDate: new Date(dto.requestDate) }),
        ...(dto.neededDate !== undefined && { neededDate: dto.neededDate ? new Date(dto.neededDate) : null }),
        ...(dto.note !== undefined && { note: dto.note ?? null }),
        ...(request.status === 'REJECTED' && { status: 'DRAFT', rejectReason: null }),
      },
    })

    if (dto.items !== undefined) {
      if (dto.items.length === 0) throw new BadRequestException('Yêu cầu phải có ít nhất một dòng vật tư')
      const items = await this.mapItems(dto.items, request.factoryId)
      await this.prisma.partRequestItem.deleteMany({ where: { requestId: id } })
      await this.prisma.partRequestItem.createMany({ data: items.map((i) => ({ ...i, requestId: id })) })
      await this.prisma.partRequest.update({
        where: { id },
        data: { totalAmount: new Prisma.Decimal(this.sumAmount(items)) },
      })
    }

    return this.findOne(id)
  }

  async submit(id: number, user: RequestUser) {
    const request = await this.findOne(id)
    assertFactoryAccess(user, request.factoryId, 'Yêu cầu không thuộc xưởng của bạn')
    if (request.status !== 'DRAFT' && request.status !== 'REJECTED') {
      throw new BadRequestException('Yêu cầu đã được trình duyệt')
    }

    await this.prisma.partRequest.update({
      where: { id },
      data: { status: 'PENDING_FACTORY', rejectReason: null },
    })
    return this.findOne(id)
  }

  /** Duyệt: xưởng trước, vượt ngưỡng chi phí thì chuyển tiếp công ty duyệt. */
  async approve(id: number, user: RequestUser) {
    const request = await this.findOne(id)
    const threshold = await this.settings.getNumber(
      SETTING_KEYS.MACHINE_COMPANY_APPROVAL_THRESHOLD,
      0,
    )
    const total = request.totalAmount != null ? Number(request.totalAmount) : 0

    if (request.status === 'PENDING_FACTORY') {
      assertFactoryAccess(user, request.factoryId, 'Yêu cầu không thuộc xưởng của bạn')
      const needCompany = total >= threshold
      await this.prisma.partRequest.update({
        where: { id },
        data: {
          status: needCompany ? 'PENDING_COMPANY' : 'APPROVED',
          factoryApprovedBy: user.employeeId,
          factoryApprovedAt: new Date(),
        },
      })
      return this.findOne(id)
    }

    if (request.status === 'PENDING_COMPANY') {
      if (user.dataScope.type !== 'COMPANY') {
        throw new ForbiddenException('Chỉ cấp công ty được duyệt bước này')
      }
      await this.prisma.partRequest.update({
        where: { id },
        data: { status: 'APPROVED', companyApprovedBy: user.employeeId, companyApprovedAt: new Date() },
      })
      return this.findOne(id)
    }

    throw new BadRequestException('Yêu cầu không ở trạng thái chờ duyệt')
  }

  async reject(id: number, user: RequestUser, dto: RejectPartRequestDto) {
    const request = await this.findOne(id)
    if (request.status !== 'PENDING_FACTORY' && request.status !== 'PENDING_COMPANY') {
      throw new BadRequestException('Yêu cầu không ở trạng thái chờ duyệt')
    }
    if (request.status === 'PENDING_FACTORY') {
      assertFactoryAccess(user, request.factoryId, 'Yêu cầu không thuộc xưởng của bạn')
    } else if (user.dataScope.type !== 'COMPANY') {
      throw new ForbiddenException('Chỉ cấp công ty được từ chối bước này')
    }

    await this.prisma.partRequest.update({
      where: { id },
      data: { status: 'REJECTED', rejectReason: dto.rejectReason },
    })
    return this.findOne(id)
  }

  /**
   * Nhận hàng và nhập kho theo yêu cầu đã duyệt.
   * Cho phép nhận nhiều lần; khi mọi dòng đã nhận đủ thì yêu cầu chuyển sang Đã mua.
   */
  async receive(id: number, user: RequestUser, dto: ReceivePartRequestDto) {
    const request = await this.findOne(id)
    assertFactoryAccess(user, request.factoryId, 'Yêu cầu không thuộc xưởng của bạn')
    if (request.status !== 'APPROVED' && request.status !== 'PURCHASED') {
      throw new BadRequestException('Chỉ nhập kho cho yêu cầu đã được duyệt')
    }

    await this.prisma.$transaction(async (tx) => {
      for (const line of dto.items) {
        const item = request.items.find((i) => i.id === line.itemId)
        if (!item) throw new NotFoundException(`Dòng vật tư id ${line.itemId} không thuộc yêu cầu này`)

        const already = Number(item.receivedQuantity)
        const remaining = Number(item.quantity) - already
        if (line.quantity > remaining) {
          throw new BadRequestException(
            `"${item.name}": còn thiếu ${remaining}, không thể nhận ${line.quantity}`,
          )
        }

        // Chỉ ghi tồn kho cho vật tư có trong danh mục phụ tùng
        if (item.sparePartId) {
          await this.stock.applyMovement(tx, 'IN', {
            sparePartId: item.sparePartId,
            factoryId: request.factoryId,
            quantity: line.quantity,
            unitPrice: line.unitPrice ?? (item.estimatedPrice != null ? Number(item.estimatedPrice) : null),
            partRequestId: id,
            supplier: dto.supplier ?? null,
            documentNo: dto.documentNo ?? null,
            reason: `Nhập kho theo yêu cầu ${request.requestNo}`,
            performedBy: user.employeeId,
            movementDate: dto.movementDate ? new Date(dto.movementDate) : undefined,
            note: dto.note ?? null,
          })
        }

        await tx.partRequestItem.update({
          where: { id: item.id },
          data: { receivedQuantity: new Prisma.Decimal(already + line.quantity) },
        })
      }

      // Đủ hàng cho mọi dòng thì đóng yêu cầu
      const items = await tx.partRequestItem.findMany({ where: { requestId: id } })
      const allReceived = items.every((i) => Number(i.receivedQuantity) >= Number(i.quantity))
      if (allReceived) {
        await tx.partRequest.update({ where: { id }, data: { status: 'PURCHASED' } })
      }
    })

    return this.findOne(id)
  }

  async cancel(id: number, user: RequestUser) {
    const request = await this.findOne(id)
    assertFactoryAccess(user, request.factoryId, 'Yêu cầu không thuộc xưởng của bạn')
    if (request.status === 'PURCHASED') throw new BadRequestException('Yêu cầu đã nhập kho xong')

    await this.prisma.partRequest.update({ where: { id }, data: { status: 'CANCELLED' } })
    return this.findOne(id)
  }

  async remove(id: number, user: RequestUser) {
    const request = await this.findOne(id)
    assertFactoryAccess(user, request.factoryId, 'Yêu cầu không thuộc xưởng của bạn')
    if (request.status !== 'DRAFT') throw new BadRequestException('Chỉ xóa được yêu cầu ở trạng thái Nháp')

    await this.prisma.partRequestItem.deleteMany({ where: { requestId: id } })
    await this.prisma.partRequest.delete({ where: { id } })
    return { message: 'Đã xóa yêu cầu' }
  }

  /**
   * Nhu cầu vật tư bảo dưỡng của một kế hoạch: cộng dồn định mức vật tư của các
   * dòng công việc, đối chiếu tồn kho xưởng để ra số lượng còn thiếu cần mua.
   */
  async materialNeeds(user: RequestUser, workPlanId: number) {
    const plan = await this.prisma.workPlan.findUnique({
      where: { id: workPlanId },
      include: {
        items: {
          include: {
            machine: { select: { id: true, code: true, name: true, categoryId: true } },
          },
        },
      },
    })
    if (!plan) throw new NotFoundException('Kế hoạch không tồn tại')
    assertFactoryAccess(user, plan.factoryId, 'Kế hoạch không thuộc xưởng của bạn')

    const norms = await this.prisma.maintenanceNorm.findMany({
      where: { isActive: true, deletedAt: null },
      include: { items: { include: { sparePart: { select: { id: true, code: true, name: true, unit: true } } } } },
      orderBy: { intervalDays: 'asc' },
    })

    // Gom nhu cầu theo phụ tùng (hoặc theo tên nếu vật tư nhập tay)
    const needs = new Map<
      string,
      { sparePartId: number | null; code: string | null; name: string; unit: string | null; required: number; machines: string[] }
    >()

    for (const item of plan.items) {
      const norm =
        norms.find((n) => n.id === item.normId) ??
        norms.find((n) => n.machineId === item.machineId) ??
        norms.find((n) => n.machineId === null && n.categoryId === item.machine.categoryId)
      if (!norm) continue

      for (const ni of norm.items) {
        const key = ni.sparePartId ? `sp-${ni.sparePartId}` : `name-${ni.name.toLowerCase()}`
        const current = needs.get(key)
        const quantity = Number(ni.quantity)
        if (current) {
          current.required += quantity
          if (!current.machines.includes(item.machine.code)) current.machines.push(item.machine.code)
        } else {
          needs.set(key, {
            sparePartId: ni.sparePartId,
            code: ni.sparePart?.code ?? null,
            name: ni.sparePart?.name ?? ni.name,
            unit: ni.unit ?? ni.sparePart?.unit ?? null,
            required: quantity,
            machines: [item.machine.code],
          })
        }
      }
    }

    const rows: NeedRow[] = []
    for (const need of needs.values()) {
      const inStock = need.sparePartId ? await this.stock.getQuantity(need.sparePartId, plan.factoryId) : 0
      rows.push({
        ...need,
        inStock,
        shortage: Math.max(0, need.required - inStock),
      })
    }

    return {
      plan: { id: plan.id, planNo: plan.planNo, title: plan.title, type: plan.type, factoryId: plan.factoryId },
      rows: rows.sort((a, b) => b.shortage - a.shortage),
    }
  }
}
