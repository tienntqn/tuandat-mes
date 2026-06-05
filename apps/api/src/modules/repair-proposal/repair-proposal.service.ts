import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {
  CreateRepairProposalDto,
  UpdateRepairProposalDto,
  RejectRepairProposalDto,
} from './dto/repair-proposal.dto'
import type { RequestUser } from '../../common/types/request-user.type'

@Injectable()
export class RepairProposalService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    user: RequestUser,
    machineId?: number,
    status?: string,
    page = 1,
    pageSize = 20,
  ) {
    const where: any = {}
    // Data scope: FACTORY chỉ thấy đề xuất của xưởng mình; LINE không có quyền
    if (user.dataScope.type === 'FACTORY' && user.dataScope.factoryId) {
      where.factoryId = user.dataScope.factoryId
    } else if (user.dataScope.type === 'LINE') {
      return { data: [], total: 0, page, pageSize, totalPages: 0 }
    }
    if (machineId) where.machineId = machineId
    if (status) where.status = status

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.repairProposal.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          machine: { select: { id: true, code: true, name: true } },
          factory: { select: { id: true, name: true } },
          items: true,
          attachments: true,
        },
      }),
      this.prisma.repairProposal.count({ where }),
    ])
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: number) {
    const proposal = await this.prisma.repairProposal.findUnique({
      where: { id },
      include: {
        machine: { select: { id: true, code: true, name: true } },
        factory: { select: { id: true, name: true } },
        items: { include: { sparePart: { select: { id: true, code: true, name: true } } } },
        attachments: true,
      },
    })
    if (!proposal) throw new NotFoundException('Đề xuất không tồn tại')
    return proposal
  }

  private async generateNo(): Promise<string> {
    let seq = (await this.prisma.repairProposal.count()) + 1
    let no = `DX${String(seq).padStart(5, '0')}`
    while (await this.prisma.repairProposal.findUnique({ where: { proposalNo: no } })) {
      seq++
      no = `DX${String(seq).padStart(5, '0')}`
    }
    return no
  }

  async create(user: RequestUser, dto: CreateRepairProposalDto) {
    const machine = await this.prisma.machine.findFirst({ where: { id: dto.machineId, deletedAt: null } })
    if (!machine) throw new NotFoundException('Máy không tồn tại')
    if (user.dataScope.type === 'FACTORY' && machine.factoryId !== user.dataScope.factoryId) {
      throw new ForbiddenException('Máy không thuộc xưởng của bạn')
    }

    const proposalNo = await this.generateNo()
    const proposal = await this.prisma.repairProposal.create({
      data: {
        proposalNo,
        machineId: dto.machineId,
        factoryId: machine.factoryId,
        type: dto.type,
        title: dto.title,
        description: dto.description ?? null,
        estimatedCost: dto.estimatedCost ?? null,
        requestedBy: user.employeeId,
        items: dto.items && dto.items.length > 0 ? {
          create: dto.items.map((it) => ({
            sparePartId: it.sparePartId ?? null,
            name: it.name,
            quantity: it.quantity,
            unit: it.unit ?? null,
            note: it.note ?? null,
          })),
        } : undefined,
        attachments: dto.attachments && dto.attachments.length > 0 ? {
          create: dto.attachments.map((a) => ({ type: a.type, url: a.url, filename: a.filename ?? null })),
        } : undefined,
      },
    })
    return this.findOne(proposal.id)
  }

  async update(id: number, dto: UpdateRepairProposalDto) {
    const proposal = await this.findOne(id)
    if (proposal.status !== 'DRAFT') {
      throw new BadRequestException('Chỉ sửa được đề xuất ở trạng thái Nháp')
    }

    await this.prisma.repairProposal.update({
      where: { id },
      data: {
        ...(dto.type && { type: dto.type }),
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.estimatedCost !== undefined && { estimatedCost: dto.estimatedCost ?? null }),
      },
    })

    // Đồng bộ items & attachments nếu được truyền
    if (dto.items !== undefined) {
      await this.prisma.repairProposalItem.deleteMany({ where: { proposalId: id } })
      if (dto.items.length > 0) {
        await this.prisma.repairProposalItem.createMany({
          data: dto.items.map((it) => ({
            proposalId: id,
            sparePartId: it.sparePartId ?? null,
            name: it.name,
            quantity: it.quantity,
            unit: it.unit ?? null,
            note: it.note ?? null,
          })),
        })
      }
    }
    if (dto.attachments !== undefined) {
      await this.prisma.repairProposalAttachment.deleteMany({ where: { proposalId: id } })
      if (dto.attachments.length > 0) {
        await this.prisma.repairProposalAttachment.createMany({
          data: dto.attachments.map((a) => ({ proposalId: id, type: a.type, url: a.url, filename: a.filename ?? null })),
        })
      }
    }
    return this.findOne(id)
  }

  async submit(id: number) {
    const proposal = await this.findOne(id)
    if (proposal.status !== 'DRAFT') throw new BadRequestException('Chỉ gửi duyệt đề xuất ở trạng thái Nháp')
    await this.prisma.repairProposal.update({ where: { id }, data: { status: 'PENDING' } })
    return this.findOne(id)
  }

  async approve(id: number, user: RequestUser) {
    const proposal = await this.findOne(id)
    if (proposal.status !== 'PENDING') throw new BadRequestException('Chỉ duyệt đề xuất đang Chờ duyệt')
    if (user.dataScope.type === 'FACTORY' && proposal.factoryId !== user.dataScope.factoryId) {
      throw new ForbiddenException('Đề xuất không thuộc xưởng của bạn')
    }
    await this.prisma.repairProposal.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: user.employeeId, approvedAt: new Date(), rejectReason: null },
    })
    return this.findOne(id)
  }

  async reject(id: number, dto: RejectRepairProposalDto, user: RequestUser) {
    const proposal = await this.findOne(id)
    if (proposal.status !== 'PENDING') throw new BadRequestException('Chỉ từ chối đề xuất đang Chờ duyệt')
    if (user.dataScope.type === 'FACTORY' && proposal.factoryId !== user.dataScope.factoryId) {
      throw new ForbiddenException('Đề xuất không thuộc xưởng của bạn')
    }
    await this.prisma.repairProposal.update({
      where: { id },
      data: { status: 'REJECTED', rejectReason: dto.rejectReason, approvedBy: user.employeeId, approvedAt: new Date() },
    })
    return this.findOne(id)
  }

  async complete(id: number) {
    const proposal = await this.findOne(id)
    if (proposal.status !== 'APPROVED') throw new BadRequestException('Chỉ hoàn thành đề xuất đã Duyệt')
    await this.prisma.repairProposal.update({ where: { id }, data: { status: 'DONE', completedAt: new Date() } })
    return this.findOne(id)
  }

  async remove(id: number) {
    const proposal = await this.findOne(id)
    if (proposal.status !== 'DRAFT') throw new BadRequestException('Chỉ xóa được đề xuất ở trạng thái Nháp')
    await this.prisma.repairProposalItem.deleteMany({ where: { proposalId: id } })
    await this.prisma.repairProposalAttachment.deleteMany({ where: { proposalId: id } })
    await this.prisma.repairProposal.delete({ where: { id } })
    return { message: 'Đã xóa đề xuất' }
  }
}
