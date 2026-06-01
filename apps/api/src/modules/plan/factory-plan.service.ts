import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateFactoryPlanDto, UpdateFactoryPlanDto, BulkCreateFactoryPlanDto } from './dto/factory-plan.dto'
import type { RequestUser } from '../../common/types/request-user.type'

@Injectable()
export class FactoryPlanService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    user: RequestUser,
    companyPlanId?: number,
    lineId?: number,
    factoryId?: number,
    page = 1,
    pageSize = 20,
  ) {
    const where: any = {}

    // Data scope: FACTORY chỉ thấy kế hoạch chuyền thuộc xưởng mình
    if (user.dataScope.type === 'FACTORY') {
      where.line = { factoryId: user.dataScope.factoryId }
    } else if (user.dataScope.type === 'LINE') {
      where.lineId = user.dataScope.lineId
    }

    if (companyPlanId) where.companyPlanId = companyPlanId
    if (lineId) where.lineId = lineId
    if (factoryId && user.dataScope.type === 'COMPANY') {
      where.line = { factoryId }
    }

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.factoryPlan.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          companyPlan: {
            include: {
              style: { select: { id: true, code: true, name: true, sam: true } },
              po: { select: { id: true, poNumber: true, totalQuantity: true, deliveryDate: true } },
              factory: { select: { id: true, code: true, name: true } },
            },
          },
          line: { select: { id: true, name: true, lineNumber: true, factoryId: true } },
        },
      }),
      this.prisma.factoryPlan.count({ where }),
    ])

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: number) {
    const plan = await this.prisma.factoryPlan.findUnique({
      where: { id },
      include: {
        companyPlan: {
          include: {
            style: { select: { id: true, code: true, name: true } },
            po: { select: { id: true, poNumber: true, totalQuantity: true } },
            factory: { select: { id: true, code: true, name: true } },
          },
        },
        line: { select: { id: true, name: true, lineNumber: true, factoryId: true } },
      },
    })
    if (!plan) throw new NotFoundException('Không tìm thấy kế hoạch xưởng')
    return plan
  }

  private async checkFactoryScope(user: RequestUser, lineId: number) {
    if (user.dataScope.type === 'COMPANY') return // COMPANY có thể tạo cho bất kỳ xưởng
    const line = await this.prisma.productionLine.findUnique({ where: { id: lineId } })
    if (!line) throw new NotFoundException('Không tìm thấy chuyền')
    if (user.dataScope.type === 'FACTORY' && line.factoryId !== user.dataScope.factoryId) {
      throw new ForbiddenException('Chuyền không thuộc xưởng của bạn')
    }
    if (user.dataScope.type === 'LINE') {
      throw new ForbiddenException('Tổ trưởng không được phép tạo kế hoạch')
    }
  }

  async create(user: RequestUser, dto: CreateFactoryPlanDto) {
    await this.checkFactoryScope(user, dto.lineId)

    const companyPlan = await this.prisma.companyPlan.findUnique({
      where: { id: dto.companyPlanId },
    })
    if (!companyPlan) throw new NotFoundException('Không tìm thấy kế hoạch công ty')

    // Kiểm tra chuyền thuộc đúng xưởng của CompanyPlan
    const line = await this.prisma.productionLine.findUnique({ where: { id: dto.lineId } })
    if (!line) throw new NotFoundException('Không tìm thấy chuyền')
    if (line.factoryId !== companyPlan.factoryId) {
      throw new BadRequestException('Chuyền không thuộc xưởng được giao trong kế hoạch công ty')
    }

    // Kiểm tra tổng phân bổ cho chuyền ≤ chỉ tiêu công ty giao
    await this.validateAllocation(dto.companyPlanId, dto.plannedQuantity)

    // Tạo FactoryPlan
    const factoryPlan = await this.prisma.factoryPlan.create({
      data: {
        companyPlanId: dto.companyPlanId,
        lineId: dto.lineId,
        plannedQuantity: dto.plannedQuantity,
        expectedFinishDate: new Date(dto.expectedFinishDate),
      },
      include: {
        companyPlan: {
          include: {
            style: { select: { id: true, code: true, name: true } },
            factory: { select: { id: true, code: true, name: true } },
          },
        },
        line: { select: { id: true, name: true, lineNumber: true } },
      },
    })

    // Tự động tạo liên kết StyleLine (chuyền nào đang may mã nào)
    await this.upsertStyleLine(companyPlan.styleId, dto.lineId)

    return factoryPlan
  }

  async bulkCreate(user: RequestUser, dto: BulkCreateFactoryPlanDto) {
    for (const plan of dto.plans) {
      await this.checkFactoryScope(user, plan.lineId)
    }

    // Nhóm theo companyPlanId để kiểm tra ràng buộc
    const byCompanyPlan = new Map<number, number>()
    for (const plan of dto.plans) {
      byCompanyPlan.set(plan.companyPlanId, (byCompanyPlan.get(plan.companyPlanId) ?? 0) + plan.plannedQuantity)
    }

    for (const [cpId, totalNew] of byCompanyPlan.entries()) {
      await this.validateAllocation(cpId, totalNew)
    }

    const results = await this.prisma.$transaction(async (tx) => {
      const created: Awaited<ReturnType<typeof tx.factoryPlan.create>>[] = []
      for (const plan of dto.plans) {
        const companyPlan = await tx.companyPlan.findUnique({ where: { id: plan.companyPlanId } })
        if (!companyPlan) throw new NotFoundException(`Không tìm thấy kế hoạch công ty id=${plan.companyPlanId}`)

        const fp = await tx.factoryPlan.create({
          data: {
            companyPlanId: plan.companyPlanId,
            lineId: plan.lineId,
            plannedQuantity: plan.plannedQuantity,
            expectedFinishDate: new Date(plan.expectedFinishDate),
          },
        })
        created.push(fp)

        // Tự động tạo/cập nhật StyleLine
        await tx.styleLine.upsert({
          where: { lineId_styleId: { lineId: plan.lineId, styleId: companyPlan.styleId } },
          create: { lineId: plan.lineId, styleId: companyPlan.styleId },
          update: {},
        })
      }
      return created
    })

    return results
  }

  async update(user: RequestUser, id: number, dto: UpdateFactoryPlanDto) {
    const plan = await this.prisma.factoryPlan.findUnique({ where: { id } })
    if (!plan) throw new NotFoundException('Không tìm thấy kế hoạch xưởng')

    await this.checkFactoryScope(user, plan.lineId)

    if (dto.plannedQuantity !== undefined) {
      await this.validateAllocation(plan.companyPlanId, dto.plannedQuantity, id)
    }

    return this.prisma.factoryPlan.update({
      where: { id },
      data: {
        ...(dto.plannedQuantity !== undefined && { plannedQuantity: dto.plannedQuantity }),
        ...(dto.expectedFinishDate && { expectedFinishDate: new Date(dto.expectedFinishDate) }),
      },
      include: {
        companyPlan: {
          include: {
            style: { select: { id: true, code: true, name: true } },
            factory: { select: { id: true, code: true, name: true } },
          },
        },
        line: { select: { id: true, name: true, lineNumber: true } },
      },
    })
  }

  async remove(user: RequestUser, id: number) {
    const plan = await this.prisma.factoryPlan.findUnique({
      where: { id },
      include: { companyPlan: true },
    })
    if (!plan) throw new NotFoundException('Không tìm thấy kế hoạch xưởng')
    await this.checkFactoryScope(user, plan.lineId)

    await this.prisma.factoryPlan.delete({ where: { id } })

    // Kiểm tra nếu không còn FactoryPlan nào dùng StyleLine này thì giữ nguyên
    // (StyleLine được giữ vì có thể có DailyOutput đang dùng)
    return { success: true }
  }

  // Kiểm tra tổng phân bổ cho chuyền không vượt chỉ tiêu công ty giao xưởng
  private async validateAllocation(companyPlanId: number, newQty: number, excludeId?: number) {
    const companyPlan = await this.prisma.companyPlan.findUnique({ where: { id: companyPlanId } })
    if (!companyPlan) throw new NotFoundException('Không tìm thấy kế hoạch công ty')

    const agg = await this.prisma.factoryPlan.aggregate({
      where: { companyPlanId, ...(excludeId ? { id: { not: excludeId } } : {}) },
      _sum: { plannedQuantity: true },
    })
    const alreadyAllocated = agg._sum.plannedQuantity ?? 0

    if (alreadyAllocated + newQty > companyPlan.plannedQuantity) {
      throw new BadRequestException(
        `Tổng phân bổ cho các chuyền (${alreadyAllocated + newQty}) vượt quá chỉ tiêu công ty giao xưởng (${companyPlan.plannedQuantity})`,
      )
    }
  }

  // Upsert StyleLine: đảm bảo liên kết chuyền-mã hàng tồn tại
  private async upsertStyleLine(styleId: number, lineId: number) {
    await this.prisma.styleLine.upsert({
      where: { lineId_styleId: { lineId, styleId } },
      create: { lineId, styleId },
      update: {},
    })
  }

  // Lấy tổng kế hoạch xưởng theo CompanyPlan (để hiển thị đã phân/còn lại)
  async getCompanyPlanProgress(companyPlanId: number) {
    const [companyPlan, factoryPlans] = await Promise.all([
      this.prisma.companyPlan.findUnique({
        where: { id: companyPlanId },
        include: {
          style: { select: { id: true, code: true, name: true } },
          factory: { select: { id: true, code: true, name: true } },
          po: { select: { id: true, poNumber: true } },
        },
      }),
      this.prisma.factoryPlan.findMany({
        where: { companyPlanId },
        include: { line: { select: { id: true, name: true, lineNumber: true } } },
      }),
    ])
    if (!companyPlan) throw new NotFoundException('Không tìm thấy kế hoạch công ty')

    const allocatedToLines = factoryPlans.reduce((sum, fp) => sum + fp.plannedQuantity, 0)
    return {
      companyPlan: {
        ...companyPlan,
        allocatedToLines,
        remainingForLines: companyPlan.plannedQuantity - allocatedToLines,
      },
      factoryPlans,
    }
  }
}
