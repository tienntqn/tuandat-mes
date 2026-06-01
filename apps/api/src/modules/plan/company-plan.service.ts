import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCompanyPlanDto, UpdateCompanyPlanDto, BulkCreateCompanyPlanDto } from './dto/company-plan.dto'
import type { RequestUser } from '../../common/types/request-user.type'

@Injectable()
export class CompanyPlanService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    user: RequestUser,
    styleId?: number,
    poId?: number,
    factoryId?: number,
    page = 1,
    pageSize = 20,
  ) {
    const where: any = {}

    // Data scope: FACTORY scope chỉ thấy kế hoạch của xưởng mình
    if (user.dataScope.type === 'FACTORY') {
      where.factoryId = user.dataScope.factoryId
    } else if (user.dataScope.type === 'LINE') {
      // LINE scope không quản lý CompanyPlan
      return { data: [], total: 0, page, pageSize, totalPages: 0 }
    }

    if (styleId) where.styleId = styleId
    if (poId) where.poId = poId
    if (factoryId && user.dataScope.type === 'COMPANY') where.factoryId = factoryId

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.companyPlan.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          style: { select: { id: true, code: true, name: true, sam: true } },
          po: { select: { id: true, poNumber: true, totalQuantity: true, deliveryDate: true } },
          factory: { select: { id: true, code: true, name: true } },
          factoryPlans: {
            include: {
              line: { select: { id: true, name: true, lineNumber: true } },
            },
          },
        },
      }),
      this.prisma.companyPlan.count({ where }),
    ])

    // Tính tổng phân bổ cho từng CompanyPlan
    const enriched = data.map((plan) => {
      const allocatedToLines = plan.factoryPlans.reduce((sum, fp) => sum + fp.plannedQuantity, 0)
      return { ...plan, allocatedToLines, remainingForLines: plan.plannedQuantity - allocatedToLines }
    })

    return { data: enriched, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: number) {
    const plan = await this.prisma.companyPlan.findUnique({
      where: { id },
      include: {
        style: { select: { id: true, code: true, name: true, sam: true } },
        po: { select: { id: true, poNumber: true, totalQuantity: true, deliveryDate: true } },
        factory: { select: { id: true, code: true, name: true } },
        factoryPlans: {
          include: {
            line: { select: { id: true, name: true, lineNumber: true } },
          },
        },
      },
    })
    if (!plan) throw new NotFoundException('Không tìm thấy kế hoạch')
    const allocatedToLines = plan.factoryPlans.reduce((sum, fp) => sum + fp.plannedQuantity, 0)
    return { ...plan, allocatedToLines, remainingForLines: plan.plannedQuantity - allocatedToLines }
  }

  // Lấy tổng đã phân bổ từ PO (để kiểm tra ràng buộc)
  private async getTotalAllocatedForPo(poId: number, excludeId?: number) {
    const plans = await this.prisma.companyPlan.findMany({
      where: { poId, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { plannedQuantity: true },
    })
    return plans.reduce((sum, p) => sum + p.plannedQuantity, 0)
  }

  async create(user: RequestUser, dto: CreateCompanyPlanDto) {
    if (user.dataScope.type !== 'COMPANY') {
      throw new ForbiddenException('Chỉ cấp công ty mới được tạo kế hoạch cấp 1')
    }

    const po = await this.prisma.purchaseOrder.findUnique({ where: { id: dto.poId } })
    if (!po) throw new NotFoundException('Không tìm thấy PO')

    // Kiểm tra: tổng phân bổ ≤ tổng SL PO
    const alreadyAllocated = await this.getTotalAllocatedForPo(dto.poId)
    if (alreadyAllocated + dto.plannedQuantity > po.totalQuantity) {
      throw new BadRequestException(
        `Tổng phân bổ vượt quá số lượng PO. PO: ${po.totalQuantity}, đã phân: ${alreadyAllocated}, thêm: ${dto.plannedQuantity}`,
      )
    }

    return this.prisma.companyPlan.create({
      data: {
        styleId: dto.styleId,
        poId: dto.poId,
        factoryId: dto.factoryId,
        plannedQuantity: dto.plannedQuantity,
        startDate: new Date(dto.startDate),
        expectedFinishDate: new Date(dto.expectedFinishDate),
      },
      include: {
        style: { select: { id: true, code: true, name: true } },
        po: { select: { id: true, poNumber: true, totalQuantity: true } },
        factory: { select: { id: true, code: true, name: true } },
      },
    })
  }

  async bulkCreate(user: RequestUser, dto: BulkCreateCompanyPlanDto) {
    if (user.dataScope.type !== 'COMPANY') {
      throw new ForbiddenException('Chỉ cấp công ty mới được tạo kế hoạch cấp 1')
    }

    // Nhóm theo PO để kiểm tra ràng buộc
    const byPo = new Map<number, number>()
    for (const plan of dto.plans) {
      byPo.set(plan.poId, (byPo.get(plan.poId) ?? 0) + plan.plannedQuantity)
    }

    for (const [poId, totalNew] of byPo.entries()) {
      const po = await this.prisma.purchaseOrder.findUnique({ where: { id: poId } })
      if (!po) throw new NotFoundException(`Không tìm thấy PO id=${poId}`)
      const alreadyAllocated = await this.getTotalAllocatedForPo(poId)
      if (alreadyAllocated + totalNew > po.totalQuantity) {
        throw new BadRequestException(
          `PO ${po.poNumber}: Tổng phân bổ (${alreadyAllocated + totalNew}) vượt quá số lượng PO (${po.totalQuantity})`,
        )
      }
    }

    return this.prisma.$transaction(
      dto.plans.map((p) =>
        this.prisma.companyPlan.create({
          data: {
            styleId: p.styleId,
            poId: p.poId,
            factoryId: p.factoryId,
            plannedQuantity: p.plannedQuantity,
            startDate: new Date(p.startDate),
            expectedFinishDate: new Date(p.expectedFinishDate),
          },
        }),
      ),
    )
  }

  async update(user: RequestUser, id: number, dto: UpdateCompanyPlanDto) {
    if (user.dataScope.type !== 'COMPANY') {
      throw new ForbiddenException('Chỉ cấp công ty mới được cập nhật kế hoạch cấp 1')
    }

    const plan = await this.prisma.companyPlan.findUnique({ where: { id } })
    if (!plan) throw new NotFoundException('Không tìm thấy kế hoạch')

    if (dto.plannedQuantity !== undefined) {
      const po = await this.prisma.purchaseOrder.findUnique({ where: { id: plan.poId } })
      const alreadyAllocated = await this.getTotalAllocatedForPo(plan.poId, id)
      if (alreadyAllocated + dto.plannedQuantity > po!.totalQuantity) {
        throw new BadRequestException(
          `Tổng phân bổ vượt quá số lượng PO (${po!.totalQuantity})`,
        )
      }

      // Kiểm tra factory plans không vượt quá số lượng mới
      const factoryPlanTotal = await this.prisma.factoryPlan.aggregate({
        where: { companyPlanId: id },
        _sum: { plannedQuantity: true },
      })
      const lineAllocated = factoryPlanTotal._sum.plannedQuantity ?? 0
      if (dto.plannedQuantity < lineAllocated) {
        throw new BadRequestException(
          `Không thể giảm xuống ${dto.plannedQuantity} vì đã phân cho chuyền ${lineAllocated}`,
        )
      }
    }

    return this.prisma.companyPlan.update({
      where: { id },
      data: {
        ...(dto.plannedQuantity !== undefined && { plannedQuantity: dto.plannedQuantity }),
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.expectedFinishDate && { expectedFinishDate: new Date(dto.expectedFinishDate) }),
      },
      include: {
        style: { select: { id: true, code: true, name: true } },
        po: { select: { id: true, poNumber: true, totalQuantity: true } },
        factory: { select: { id: true, code: true, name: true } },
      },
    })
  }

  async remove(user: RequestUser, id: number) {
    if (user.dataScope.type !== 'COMPANY') {
      throw new ForbiddenException('Chỉ cấp công ty mới được xóa kế hoạch cấp 1')
    }

    // Kiểm tra không có FactoryPlan con
    const childCount = await this.prisma.factoryPlan.count({ where: { companyPlanId: id } })
    if (childCount > 0) {
      throw new BadRequestException('Không thể xóa: kế hoạch đã được xưởng phân bổ cho chuyền')
    }

    return this.prisma.companyPlan.delete({ where: { id } })
  }

  // Thống kê phân bổ PO: tổng PO vs đã phân cho các xưởng
  async getPOAllocationSummary(poId: number) {
    const [po, plans] = await Promise.all([
      this.prisma.purchaseOrder.findUnique({
        where: { id: poId },
        include: { style: { select: { id: true, code: true, name: true } } },
      }),
      this.prisma.companyPlan.findMany({
        where: { poId },
        include: {
          factory: { select: { id: true, code: true, name: true } },
          factoryPlans: { select: { plannedQuantity: true } },
        },
      }),
    ])
    if (!po) throw new NotFoundException('Không tìm thấy PO')

    const totalAllocated = plans.reduce((sum, p) => sum + p.plannedQuantity, 0)
    return {
      po,
      totalQuantity: po.totalQuantity,
      totalAllocated,
      remaining: po.totalQuantity - totalAllocated,
      plans: plans.map((p) => ({
        ...p,
        allocatedToLines: p.factoryPlans.reduce((s, fp) => s + fp.plannedQuantity, 0),
      })),
    }
  }
}
