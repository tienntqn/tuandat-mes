import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {
  CreateBreakdownDto,
  UpdateBreakdownDto,
  CreateIncidentDto,
  UpdateIncidentDto,
} from './dto/breakdown.dto'
import { generateDocumentNo } from '../../common/utils/document-no.util'
import { assertFactoryAccess } from '../../common/utils/data-scope.util'
import { changeMachineStatus } from '../../common/utils/machine-status.util'
import type { RequestUser } from '../../common/types/request-user.type'

const BREAKDOWN_INCLUDE = {
  machine: {
    select: {
      id: true, code: true, name: true, model: true, serialNo: true,
      brandRef: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
    },
  },
  factory: { select: { id: true, code: true, name: true } },
  line: { select: { id: true, name: true, lineNumber: true } },
  incidentReport: { select: { id: true, incidentNo: true } },
  workOrders: { select: { id: true, orderNo: true, status: true } },
}

@Injectable()
export class BreakdownService {
  constructor(private prisma: PrismaService) {}

  // ============ PHIẾU BÁO HỎNG ============

  async findAll(
    user: RequestUser,
    status?: string,
    severity?: string,
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
    if (status) where.status = status
    if (severity) where.severity = severity
    if (machineId) where.machineId = machineId
    if (search) {
      where.OR = [
        { reportNo: { contains: search, mode: 'insensitive' } },
        { symptom: { contains: search, mode: 'insensitive' } },
        { machine: { code: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.breakdownReport.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { reportedAt: 'desc' },
        include: BREAKDOWN_INCLUDE,
      }),
      this.prisma.breakdownReport.count({ where }),
    ])
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: number) {
    const report = await this.prisma.breakdownReport.findUnique({
      where: { id },
      include: BREAKDOWN_INCLUDE,
    })
    if (!report) throw new NotFoundException('Phiếu báo hỏng không tồn tại')
    return report
  }

  async create(user: RequestUser, dto: CreateBreakdownDto) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: dto.machineId, deletedAt: null },
      select: { id: true, factoryId: true, lineId: true },
    })
    if (!machine) throw new NotFoundException('Máy không tồn tại')
    assertFactoryAccess(user, machine.factoryId, 'Máy không thuộc xưởng của bạn')

    const reportNo = await generateDocumentNo('BH', async (no) => {
      const found = await this.prisma.breakdownReport.findUnique({ where: { reportNo: no } })
      return !!found
    })

    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.breakdownReport.create({
        data: {
          reportNo,
          machineId: dto.machineId,
          factoryId: machine.factoryId,
          lineId: dto.lineId ?? machine.lineId,
          severity: dto.severity ?? 'MEDIUM',
          symptom: dto.symptom,
          stoppedProduction: dto.stoppedProduction ?? false,
          imageUrls: dto.imageUrls ?? [],
          reportedBy: user.employeeId,
          note: dto.note ?? null,
        },
      })

      // Báo hỏng thì máy chuyển ngay sang trạng thái Hỏng để không xếp việc vào máy này
      await changeMachineStatus(tx, dto.machineId, 'BROKEN', {
        reason: `Báo hỏng ${reportNo}`,
        refType: 'BREAKDOWN',
        refId: created.id,
        changedBy: user.employeeId,
      })
      return created
    })

    return this.findOne(report.id)
  }

  async update(id: number, user: RequestUser, dto: UpdateBreakdownDto) {
    const report = await this.findOne(id)
    assertFactoryAccess(user, report.factoryId, 'Phiếu không thuộc xưởng của bạn')
    if (report.status === 'RESOLVED' || report.status === 'CANCELLED') {
      throw new BadRequestException('Phiếu đã kết thúc, không sửa được')
    }

    await this.prisma.breakdownReport.update({
      where: { id },
      data: {
        ...(dto.lineId !== undefined && { lineId: dto.lineId ?? null }),
        ...(dto.severity && { severity: dto.severity }),
        ...(dto.symptom && { symptom: dto.symptom }),
        ...(dto.stoppedProduction !== undefined && { stoppedProduction: dto.stoppedProduction }),
        ...(dto.imageUrls !== undefined && { imageUrls: dto.imageUrls }),
        ...(dto.note !== undefined && { note: dto.note ?? null }),
      },
    })
    return this.findOne(id)
  }

  /** Cơ điện tiếp nhận phiếu báo hỏng. */
  async acknowledge(id: number, user: RequestUser) {
    const report = await this.findOne(id)
    assertFactoryAccess(user, report.factoryId, 'Phiếu không thuộc xưởng của bạn')
    if (report.status !== 'REPORTED') throw new BadRequestException('Phiếu đã được tiếp nhận')

    await this.prisma.breakdownReport.update({
      where: { id },
      data: { status: 'ACKNOWLEDGED', acknowledgedBy: user.employeeId, acknowledgedAt: new Date() },
    })
    return this.findOne(id)
  }

  /** Đóng phiếu báo hỏng khi máy đã được xử lý xong. */
  async resolve(id: number, user: RequestUser) {
    const report = await this.findOne(id)
    assertFactoryAccess(user, report.factoryId, 'Phiếu không thuộc xưởng của bạn')
    if (report.status === 'RESOLVED') throw new BadRequestException('Phiếu đã được đóng')
    if (report.status === 'CANCELLED') throw new BadRequestException('Phiếu đã bị hủy')

    await this.prisma.breakdownReport.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    })
    return this.findOne(id)
  }

  async cancel(id: number, user: RequestUser) {
    const report = await this.findOne(id)
    assertFactoryAccess(user, report.factoryId, 'Phiếu không thuộc xưởng của bạn')
    if (report.status === 'RESOLVED') throw new BadRequestException('Phiếu đã xử lý xong, không hủy được')

    await this.prisma.$transaction(async (tx) => {
      await tx.breakdownReport.update({ where: { id }, data: { status: 'CANCELLED' } })
      // Hủy báo hỏng nhầm thì trả máy về trạng thái chờ
      await changeMachineStatus(tx, report.machineId, 'IDLE', {
        reason: `Hủy phiếu báo hỏng ${report.reportNo}`,
        refType: 'BREAKDOWN',
        refId: report.id,
        changedBy: user.employeeId,
      })
    })
    return this.findOne(id)
  }

  // ============ BIÊN BẢN SỰ CỐ ============

  async findIncidents(user: RequestUser, machineId?: number, search?: string, page = 1, pageSize = 20) {
    const where: any = {}
    if (user.dataScope.type === 'FACTORY') {
      where.factoryId = user.dataScope.factoryId
    } else if (user.dataScope.type === 'LINE') {
      return { data: [], total: 0, page, pageSize, totalPages: 0 }
    }
    if (machineId) where.machineId = machineId
    if (search) {
      where.OR = [
        { incidentNo: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { machine: { code: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.incidentReport.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { incidentDate: 'desc' },
        include: {
          machine: { select: { id: true, code: true, name: true, model: true, serialNo: true } },
          factory: { select: { id: true, code: true, name: true } },
          breakdownReport: { select: { id: true, reportNo: true, symptom: true } },
        },
      }),
      this.prisma.incidentReport.count({ where }),
    ])
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findIncident(id: number) {
    const incident = await this.prisma.incidentReport.findUnique({
      where: { id },
      include: {
        machine: { select: { id: true, code: true, name: true, model: true, serialNo: true } },
        factory: { select: { id: true, code: true, name: true } },
        breakdownReport: { select: { id: true, reportNo: true, symptom: true } },
      },
    })
    if (!incident) throw new NotFoundException('Biên bản sự cố không tồn tại')
    return incident
  }

  async createIncident(user: RequestUser, dto: CreateIncidentDto) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: dto.machineId, deletedAt: null },
      select: { id: true, factoryId: true },
    })
    if (!machine) throw new NotFoundException('Máy không tồn tại')
    assertFactoryAccess(user, machine.factoryId, 'Máy không thuộc xưởng của bạn')

    // Mỗi phiếu báo hỏng chỉ lập được một biên bản sự cố
    if (dto.breakdownReportId) {
      const breakdown = await this.prisma.breakdownReport.findUnique({
        where: { id: dto.breakdownReportId },
        include: { incidentReport: { select: { id: true } } },
      })
      if (!breakdown) throw new NotFoundException('Phiếu báo hỏng không tồn tại')
      if (breakdown.machineId !== dto.machineId) {
        throw new BadRequestException('Phiếu báo hỏng không thuộc máy này')
      }
      if (breakdown.incidentReport) {
        throw new BadRequestException('Phiếu báo hỏng này đã có biên bản sự cố')
      }
    }

    const incidentNo = await generateDocumentNo('SC', async (no) => {
      const found = await this.prisma.incidentReport.findUnique({ where: { incidentNo: no } })
      return !!found
    })

    const created = await this.prisma.incidentReport.create({
      data: {
        incidentNo,
        machineId: dto.machineId,
        factoryId: machine.factoryId,
        breakdownReportId: dto.breakdownReportId ?? null,
        incidentDate: new Date(dto.incidentDate),
        description: dto.description,
        cause: dto.cause ?? null,
        consequence: dto.consequence ?? null,
        downtimeHours: dto.downtimeHours ?? null,
        damageValue: dto.damageValue ?? null,
        responsibleParty: dto.responsibleParty ?? null,
        preventiveAction: dto.preventiveAction ?? null,
        witnesses: dto.witnesses ?? null,
        imageUrls: dto.imageUrls ?? [],
        createdBy: user.employeeId,
      },
    })
    return this.findIncident(created.id)
  }

  async updateIncident(id: number, user: RequestUser, dto: UpdateIncidentDto) {
    const incident = await this.findIncident(id)
    assertFactoryAccess(user, incident.factoryId, 'Biên bản không thuộc xưởng của bạn')

    await this.prisma.incidentReport.update({
      where: { id },
      data: {
        ...(dto.incidentDate && { incidentDate: new Date(dto.incidentDate) }),
        ...(dto.description && { description: dto.description }),
        ...(dto.cause !== undefined && { cause: dto.cause ?? null }),
        ...(dto.consequence !== undefined && { consequence: dto.consequence ?? null }),
        ...(dto.downtimeHours !== undefined && { downtimeHours: dto.downtimeHours ?? null }),
        ...(dto.damageValue !== undefined && { damageValue: dto.damageValue ?? null }),
        ...(dto.responsibleParty !== undefined && { responsibleParty: dto.responsibleParty ?? null }),
        ...(dto.preventiveAction !== undefined && { preventiveAction: dto.preventiveAction ?? null }),
        ...(dto.witnesses !== undefined && { witnesses: dto.witnesses ?? null }),
        ...(dto.imageUrls !== undefined && { imageUrls: dto.imageUrls }),
      },
    })
    return this.findIncident(id)
  }

  async removeIncident(id: number, user: RequestUser) {
    const incident = await this.findIncident(id)
    assertFactoryAccess(user, incident.factoryId, 'Biên bản không thuộc xưởng của bạn')
    await this.prisma.incidentReport.delete({ where: { id } })
    return { message: 'Đã xóa biên bản sự cố' }
  }
}
