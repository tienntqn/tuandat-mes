import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateContainerLoadingPlanDto } from './dto/container-loading.dto'
import type { RequestUser } from '../../common/types/request-user.type'

const LIST_SELECT = {
  id: true,
  name: true,
  containerTypeCode: true,
  containerLength: true,
  containerWidth: true,
  containerHeight: true,
  containersUsed: true,
  overallUtilization: true,
  createdBy: true,
  createdAt: true,
} as const

@Injectable()
export class ContainerLoadingService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.containerLoadingPlan.findMany({
        where: { deletedAt: null },
        select: LIST_SELECT,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.containerLoadingPlan.count({ where: { deletedAt: null } }),
    ])

    const enriched = await this.attachCreatorName(data)
    return { data: enriched, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  // Gắn tên người tạo (Employee.fullName qua User) vào danh sách để hiển thị, tránh phải khai báo
  // quan hệ Prisma tới User chỉ vì 1 cột hiển thị
  private async attachCreatorName<T extends { createdBy: number | null }>(
    items: T[],
  ): Promise<(T & { createdByName: string | null })[]> {
    const ids = [...new Set(items.map((i) => i.createdBy).filter((id): id is number => id != null))]
    if (ids.length === 0) return items.map((i) => ({ ...i, createdByName: null }))

    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, employee: { select: { fullName: true } } },
    })
    const map = new Map(users.map((u) => [u.id, u.employee?.fullName ?? null]))
    return items.map((i) => ({ ...i, createdByName: i.createdBy != null ? (map.get(i.createdBy) ?? null) : null }))
  }

  async findOne(id: number) {
    const plan = await this.prisma.containerLoadingPlan.findFirst({ where: { id, deletedAt: null } })
    if (!plan) throw new NotFoundException('Không tìm thấy bản ghi xếp container')
    return plan
  }

  async create(user: RequestUser, dto: CreateContainerLoadingPlanDto) {
    return this.prisma.containerLoadingPlan.create({
      data: {
        name: dto.name,
        containerTypeCode: dto.containerTypeCode,
        containerLength: dto.containerLength,
        containerWidth: dto.containerWidth,
        containerHeight: dto.containerHeight,
        cartons: dto.cartons as any,
        result: dto.result as any,
        containersUsed: dto.containersUsed,
        overallUtilization: dto.overallUtilization,
        createdBy: user.id,
      },
    })
  }

  async remove(id: number) {
    const plan = await this.prisma.containerLoadingPlan.findFirst({ where: { id, deletedAt: null } })
    if (!plan) throw new NotFoundException('Không tìm thấy bản ghi xếp container')
    await this.prisma.containerLoadingPlan.update({ where: { id }, data: { deletedAt: new Date() } })
    return { success: true }
  }
}
