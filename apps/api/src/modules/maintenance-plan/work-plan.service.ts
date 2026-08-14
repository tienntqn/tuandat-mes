import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService, SETTING_KEYS } from '../settings/settings.service'
import { CreateWorkPlanDto, UpdateWorkPlanDto, RejectDto, WorkPlanItemInput } from './dto/maintenance-plan.dto'
import { generateDocumentNo } from '../../common/utils/document-no.util'
import { assertFactoryAccess } from '../../common/utils/data-scope.util'
import type { RequestUser } from '../../common/types/request-user.type'

const PLAN_INCLUDE = {
  factory: { select: { id: true, code: true, name: true } },
  items: {
    orderBy: { plannedDate: 'asc' as const },
    include: {
      machine: {
        select: {
          id: true, code: true, name: true,
          category: { select: { id: true, name: true } },
          line: { select: { id: true, name: true } },
        },
      },
      workOrder: { select: { id: true, orderNo: true, status: true } },
    },
  },
}

/**
 * Kế hoạch sửa chữa / bảo dưỡng với luồng duyệt 2 cấp:
 * Cơ điện lập (DRAFT) → trình xưởng (PENDING_FACTORY) → giám đốc xưởng duyệt
 * → nếu chi phí vượt ngưỡng cấu hình thì trình công ty (PENDING_COMPANY) → công ty duyệt (APPROVED).
 */
@Injectable()
export class WorkPlanService {
  constructor(
    private prisma: PrismaService,
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
        { planNo: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ]
    }

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.workPlan.findMany({
        where, skip, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: PLAN_INCLUDE,
      }),
      this.prisma.workPlan.count({ where }),
    ])
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: number) {
    const plan = await this.prisma.workPlan.findUnique({ where: { id }, include: PLAN_INCLUDE })
    if (!plan) throw new NotFoundException('Kế hoạch không tồn tại')
    return plan
  }

  private async mapItems(items: WorkPlanItemInput[], factoryId: number) {
    // Mọi máy trong kế hoạch phải thuộc xưởng lập kế hoạch
    const machineIds = [...new Set(items.map((i) => i.machineId))]
    const machines = await this.prisma.machine.findMany({
      where: { id: { in: machineIds }, deletedAt: null },
      select: { id: true, factoryId: true, code: true },
    })
    for (const id of machineIds) {
      const machine = machines.find((m) => m.id === id)
      if (!machine) throw new NotFoundException(`Máy id ${id} không tồn tại`)
      if (machine.factoryId !== factoryId) {
        throw new BadRequestException(`Máy ${machine.code} không thuộc xưởng của kế hoạch`)
      }
    }

    return items.map((i) => ({
      machineId: i.machineId,
      normId: i.normId ?? null,
      plannedDate: new Date(i.plannedDate),
      content: i.content,
      estimatedCost: i.estimatedCost ?? null,
      note: i.note ?? null,
    }))
  }

  private sumEstimated(items: { estimatedCost?: number | null }[]) {
    return items.reduce((sum, i) => sum + (i.estimatedCost != null ? Number(i.estimatedCost) : 0), 0)
  }

  async create(user: RequestUser, dto: CreateWorkPlanDto) {
    // Người dùng cấp xưởng luôn lập cho xưởng mình; cấp công ty phải chỉ rõ xưởng
    const factoryId =
      user.dataScope.type === 'FACTORY' ? user.dataScope.factoryId : dto.factoryId
    if (!factoryId) throw new BadRequestException('Phải chọn xưởng lập kế hoạch')
    assertFactoryAccess(user, factoryId)

    const factory = await this.prisma.factory.findFirst({ where: { id: factoryId, deletedAt: null } })
    if (!factory) throw new NotFoundException('Xưởng không tồn tại')

    if (new Date(dto.periodTo) < new Date(dto.periodFrom)) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu')
    }

    const prefix = dto.type === 'REPAIR' ? 'KSC' : 'KBD'
    const planNo = await generateDocumentNo(prefix, async (no) => {
      const found = await this.prisma.workPlan.findUnique({ where: { planNo: no } })
      return !!found
    })

    const items = dto.items?.length ? await this.mapItems(dto.items, factoryId) : []

    const created = await this.prisma.workPlan.create({
      data: {
        planNo,
        type: dto.type,
        factoryId,
        title: dto.title,
        periodFrom: new Date(dto.periodFrom),
        periodTo: new Date(dto.periodTo),
        totalEstimatedCost: new Prisma.Decimal(this.sumEstimated(items)),
        note: dto.note ?? null,
        createdBy: user.employeeId,
        items: items.length ? { create: items } : undefined,
      },
    })
    return this.findOne(created.id)
  }

  async update(id: number, user: RequestUser, dto: UpdateWorkPlanDto) {
    const plan = await this.findOne(id)
    assertFactoryAccess(user, plan.factoryId, 'Kế hoạch không thuộc xưởng của bạn')
    if (plan.status !== 'DRAFT' && plan.status !== 'REJECTED') {
      throw new BadRequestException('Chỉ sửa được kế hoạch ở trạng thái Nháp hoặc bị từ chối')
    }

    const periodFrom = dto.periodFrom ? new Date(dto.periodFrom) : plan.periodFrom
    const periodTo = dto.periodTo ? new Date(dto.periodTo) : plan.periodTo
    if (periodTo < periodFrom) throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu')

    await this.prisma.workPlan.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.periodFrom && { periodFrom }),
        ...(dto.periodTo && { periodTo }),
        ...(dto.note !== undefined && { note: dto.note ?? null }),
        // Sửa lại kế hoạch bị từ chối thì đưa về Nháp để trình lại
        ...(plan.status === 'REJECTED' && { status: 'DRAFT', rejectReason: null }),
      },
    })

    if (dto.items !== undefined) {
      // Không xóa dòng đã có phiếu thực hiện để không mất liên kết lịch sử
      const executed = plan.items.filter((i) => i.workOrder)
      if (executed.length > 0) {
        throw new BadRequestException(
          `Kế hoạch đã có ${executed.length} dòng được thực hiện, không thể thay toàn bộ danh sách`,
        )
      }
      const items = await this.mapItems(dto.items, plan.factoryId)
      await this.prisma.workPlanItem.deleteMany({ where: { planId: id } })
      if (items.length > 0) {
        await this.prisma.workPlanItem.createMany({ data: items.map((i) => ({ ...i, planId: id })) })
      }
      await this.prisma.workPlan.update({
        where: { id },
        data: { totalEstimatedCost: new Prisma.Decimal(this.sumEstimated(items)) },
      })
    }

    return this.findOne(id)
  }

  /** Cơ điện trình kế hoạch lên giám đốc xưởng. */
  async submit(id: number, user: RequestUser) {
    const plan = await this.findOne(id)
    assertFactoryAccess(user, plan.factoryId, 'Kế hoạch không thuộc xưởng của bạn')
    if (plan.status !== 'DRAFT' && plan.status !== 'REJECTED') {
      throw new BadRequestException('Kế hoạch đã được trình duyệt')
    }
    if (plan.items.length === 0) throw new BadRequestException('Kế hoạch chưa có dòng công việc nào')

    await this.prisma.workPlan.update({
      where: { id },
      data: { status: 'PENDING_FACTORY', rejectReason: null },
    })
    return this.findOne(id)
  }

  /**
   * Duyệt kế hoạch. Cấp xưởng duyệt trước; nếu tổng chi phí dự kiến vượt ngưỡng
   * cấu hình thì hồ sơ tiếp tục chuyển lên công ty duyệt.
   */
  async approve(id: number, user: RequestUser) {
    const plan = await this.findOne(id)
    const threshold = await this.settings.getNumber(
      SETTING_KEYS.MACHINE_COMPANY_APPROVAL_THRESHOLD,
      0,
    )
    const total = plan.totalEstimatedCost != null ? Number(plan.totalEstimatedCost) : 0

    if (plan.status === 'PENDING_FACTORY') {
      assertFactoryAccess(user, plan.factoryId, 'Kế hoạch không thuộc xưởng của bạn')
      const needCompany = total >= threshold
      await this.prisma.workPlan.update({
        where: { id },
        data: {
          status: needCompany ? 'PENDING_COMPANY' : 'APPROVED',
          factoryApprovedBy: user.employeeId,
          factoryApprovedAt: new Date(),
        },
      })
      return this.findOne(id)
    }

    if (plan.status === 'PENDING_COMPANY') {
      if (user.dataScope.type !== 'COMPANY') {
        throw new ForbiddenException('Chỉ cấp công ty được duyệt bước này')
      }
      await this.prisma.workPlan.update({
        where: { id },
        data: { status: 'APPROVED', companyApprovedBy: user.employeeId, companyApprovedAt: new Date() },
      })
      return this.findOne(id)
    }

    throw new BadRequestException('Kế hoạch không ở trạng thái chờ duyệt')
  }

  async reject(id: number, user: RequestUser, dto: RejectDto) {
    const plan = await this.findOne(id)
    if (plan.status !== 'PENDING_FACTORY' && plan.status !== 'PENDING_COMPANY') {
      throw new BadRequestException('Kế hoạch không ở trạng thái chờ duyệt')
    }
    if (plan.status === 'PENDING_FACTORY') {
      assertFactoryAccess(user, plan.factoryId, 'Kế hoạch không thuộc xưởng của bạn')
    } else if (user.dataScope.type !== 'COMPANY') {
      throw new ForbiddenException('Chỉ cấp công ty được từ chối bước này')
    }

    await this.prisma.workPlan.update({
      where: { id },
      data: { status: 'REJECTED', rejectReason: dto.rejectReason },
    })
    return this.findOne(id)
  }

  /** Đánh dấu kế hoạch đang triển khai / đã hoàn thành. */
  async setProgress(id: number, user: RequestUser, status: 'IN_PROGRESS' | 'COMPLETED') {
    const plan = await this.findOne(id)
    assertFactoryAccess(user, plan.factoryId, 'Kế hoạch không thuộc xưởng của bạn')
    if (status === 'IN_PROGRESS' && plan.status !== 'APPROVED') {
      throw new BadRequestException('Chỉ triển khai được kế hoạch đã duyệt')
    }
    if (status === 'COMPLETED' && plan.status !== 'IN_PROGRESS' && plan.status !== 'APPROVED') {
      throw new BadRequestException('Kế hoạch chưa được duyệt')
    }

    await this.prisma.workPlan.update({ where: { id }, data: { status } })
    return this.findOne(id)
  }

  async cancel(id: number, user: RequestUser) {
    const plan = await this.findOne(id)
    assertFactoryAccess(user, plan.factoryId, 'Kế hoạch không thuộc xưởng của bạn')
    if (plan.status === 'COMPLETED') throw new BadRequestException('Kế hoạch đã hoàn thành')

    await this.prisma.workPlan.update({ where: { id }, data: { status: 'CANCELLED' } })
    return this.findOne(id)
  }

  async remove(id: number, user: RequestUser) {
    const plan = await this.findOne(id)
    assertFactoryAccess(user, plan.factoryId, 'Kế hoạch không thuộc xưởng của bạn')
    if (plan.status !== 'DRAFT') throw new BadRequestException('Chỉ xóa được kế hoạch ở trạng thái Nháp')

    await this.prisma.workPlanItem.deleteMany({ where: { planId: id } })
    await this.prisma.workPlan.delete({ where: { id } })
    return { message: 'Đã xóa kế hoạch' }
  }

  /**
   * Dự tính kế hoạch bảo dưỡng: với mỗi máy, lấy định mức áp dụng (riêng máy hoặc theo
   * chủng loại) và lần bảo dưỡng gần nhất để tính ngày đến hạn kế tiếp.
   * Trả về các máy đến hạn trong `daysAhead` ngày, kèm máy đã quá hạn.
   */
  async forecast(user: RequestUser, daysAhead = 30, factoryId?: number) {
    const where: any = { deletedAt: null, liquidatedAt: null }
    if (user.dataScope.type === 'FACTORY') {
      where.factoryId = user.dataScope.factoryId
    } else if (user.dataScope.type === 'LINE') {
      return []
    } else if (factoryId) {
      where.factoryId = factoryId
    }

    const [machines, norms] = await Promise.all([
      this.prisma.machine.findMany({
        where,
        select: {
          id: true, code: true, name: true, categoryId: true, purchaseDate: true, createdAt: true,
          factory: { select: { id: true, name: true } },
          line: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          maintenances: {
            orderBy: { maintenanceDate: 'desc' },
            take: 1,
            select: { maintenanceDate: true, nextDueDate: true },
          },
        },
      }),
      this.prisma.maintenanceNorm.findMany({
        where: { isActive: true, deletedAt: null },
        include: { items: { include: { sparePart: { select: { id: true, code: true, name: true, unit: true } } } } },
        orderBy: { intervalDays: 'asc' },
      }),
    ])

    const limit = new Date()
    limit.setDate(limit.getDate() + daysAhead)
    const today = new Date()

    const rows = machines.map((m) => {
      // Ưu tiên định mức khai riêng cho máy, sau đó mới theo chủng loại
      const norm =
        norms.find((n) => n.machineId === m.id) ??
        norms.find((n) => n.machineId === null && n.categoryId === m.categoryId) ??
        null

      const last = m.maintenances[0]
      // Chưa từng bảo dưỡng thì tính mốc từ ngày mua (hoặc ngày khai báo máy)
      const baseDate = last?.maintenanceDate ?? m.purchaseDate ?? m.createdAt
      const dueDate = last?.nextDueDate
        ? new Date(last.nextDueDate)
        : norm
          ? new Date(new Date(baseDate).getTime() + norm.intervalDays * 86400000)
          : null

      return {
        machineId: m.id,
        machineCode: m.code,
        machineName: m.name,
        factory: m.factory,
        line: m.line,
        category: m.category,
        norm: norm
          ? {
              id: norm.id,
              code: norm.code,
              name: norm.name,
              intervalDays: norm.intervalDays,
              estimatedCost: norm.estimatedCost,
              checklist: norm.checklist,
              items: norm.items,
            }
          : null,
        lastMaintenanceDate: last?.maintenanceDate ?? null,
        dueDate,
        isOverdue: dueDate ? dueDate < today : false,
        daysUntilDue: dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / 86400000) : null,
      }
    })

    return rows
      .filter((r) => r.dueDate !== null && r.dueDate <= limit)
      .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))
  }
}
