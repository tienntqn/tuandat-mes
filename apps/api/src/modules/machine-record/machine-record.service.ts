import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {
  CreateCertificateDto,
  UpdateCertificateDto,
  CreateMachineDocumentDto,
  UpdateMachineDocumentDto,
} from './dto/machine-record.dto'
import { assertFactoryAccess } from '../../common/utils/data-scope.util'
import type { RequestUser } from '../../common/types/request-user.type'

@Injectable()
export class MachineRecordService {
  constructor(private prisma: PrismaService) {}

  private async getMachine(machineId: number) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: machineId, deletedAt: null },
      select: { id: true, factoryId: true, code: true, name: true },
    })
    if (!machine) throw new NotFoundException('Máy không tồn tại')
    return machine
  }

  // ============ CHỨNG CHỈ / KIỂM ĐỊNH ============

  async findCertificates(user: RequestUser, machineId?: number, expiringInDays?: number) {
    const where: any = { deletedAt: null }
    if (machineId) where.machineId = machineId

    // Người dùng cấp xưởng chỉ thấy chứng chỉ của máy trong xưởng mình
    if (user.dataScope.type === 'FACTORY') {
      where.machine = { factoryId: user.dataScope.factoryId }
    } else if (user.dataScope.type === 'LINE') {
      return []
    }

    // Lọc chứng chỉ sắp hết hạn trong N ngày (bao gồm cả những cái đã quá hạn)
    if (expiringInDays !== undefined) {
      const limit = new Date()
      limit.setDate(limit.getDate() + expiringInDays)
      where.expiryDate = { not: null, lte: limit }
    }

    return this.prisma.machineCertificate.findMany({
      where,
      orderBy: [{ expiryDate: 'asc' }, { id: 'desc' }],
      include: {
        machine: {
          select: {
            id: true, code: true, name: true,
            factory: { select: { id: true, name: true } },
          },
        },
      },
    })
  }

  async findCertificate(id: number) {
    const cert = await this.prisma.machineCertificate.findFirst({
      where: { id, deletedAt: null },
      include: { machine: { select: { id: true, code: true, name: true, factoryId: true } } },
    })
    if (!cert) throw new NotFoundException('Chứng chỉ không tồn tại')
    return cert
  }

  async createCertificate(user: RequestUser, dto: CreateCertificateDto) {
    const machine = await this.getMachine(dto.machineId)
    assertFactoryAccess(user, machine.factoryId, 'Máy không thuộc xưởng của bạn')

    const cert = await this.prisma.machineCertificate.create({
      data: {
        machineId: dto.machineId,
        type: dto.type ?? 'INSPECTION',
        certNo: dto.certNo ?? null,
        name: dto.name,
        issuedBy: dto.issuedBy ?? null,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        fileUrl: dto.fileUrl ?? null,
        note: dto.note ?? null,
      },
    })
    return this.findCertificate(cert.id)
  }

  async updateCertificate(id: number, user: RequestUser, dto: UpdateCertificateDto) {
    const cert = await this.findCertificate(id)
    assertFactoryAccess(user, cert.machine.factoryId, 'Máy không thuộc xưởng của bạn')

    await this.prisma.machineCertificate.update({
      where: { id },
      data: {
        ...(dto.type && { type: dto.type }),
        ...(dto.certNo !== undefined && { certNo: dto.certNo ?? null }),
        ...(dto.name && { name: dto.name }),
        ...(dto.issuedBy !== undefined && { issuedBy: dto.issuedBy ?? null }),
        ...(dto.issueDate !== undefined && { issueDate: dto.issueDate ? new Date(dto.issueDate) : null }),
        ...(dto.expiryDate !== undefined && { expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null }),
        ...(dto.fileUrl !== undefined && { fileUrl: dto.fileUrl ?? null }),
        ...(dto.note !== undefined && { note: dto.note ?? null }),
      },
    })
    return this.findCertificate(id)
  }

  async removeCertificate(id: number, user: RequestUser) {
    const cert = await this.findCertificate(id)
    assertFactoryAccess(user, cert.machine.factoryId, 'Máy không thuộc xưởng của bạn')
    await this.prisma.machineCertificate.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'Đã xóa chứng chỉ' }
  }

  // ============ TÀI LIỆU HỒ SƠ MÁY ============

  async findDocuments(machineId: number, type?: string) {
    await this.getMachine(machineId)
    const where: any = { machineId, deletedAt: null }
    if (type) where.type = type
    return this.prisma.machineDocument.findMany({ where, orderBy: { createdAt: 'desc' } })
  }

  async createDocument(user: RequestUser, dto: CreateMachineDocumentDto) {
    const machine = await this.getMachine(dto.machineId)
    assertFactoryAccess(user, machine.factoryId, 'Máy không thuộc xưởng của bạn')

    return this.prisma.machineDocument.create({
      data: {
        machineId: dto.machineId,
        type: dto.type ?? 'OTHER',
        name: dto.name,
        url: dto.url,
        filename: dto.filename ?? null,
        note: dto.note ?? null,
        uploadedBy: user.employeeId,
      },
    })
  }

  async updateDocument(id: number, user: RequestUser, dto: UpdateMachineDocumentDto) {
    const doc = await this.prisma.machineDocument.findFirst({
      where: { id, deletedAt: null },
      include: { machine: { select: { factoryId: true } } },
    })
    if (!doc) throw new NotFoundException('Tài liệu không tồn tại')
    assertFactoryAccess(user, doc.machine.factoryId, 'Máy không thuộc xưởng của bạn')

    return this.prisma.machineDocument.update({
      where: { id },
      data: {
        ...(dto.type && { type: dto.type }),
        ...(dto.name && { name: dto.name }),
        ...(dto.url && { url: dto.url }),
        ...(dto.filename !== undefined && { filename: dto.filename ?? null }),
        ...(dto.note !== undefined && { note: dto.note ?? null }),
      },
    })
  }

  async removeDocument(id: number, user: RequestUser) {
    const doc = await this.prisma.machineDocument.findFirst({
      where: { id, deletedAt: null },
      include: { machine: { select: { factoryId: true } } },
    })
    if (!doc) throw new NotFoundException('Tài liệu không tồn tại')
    assertFactoryAccess(user, doc.machine.factoryId, 'Máy không thuộc xưởng của bạn')

    await this.prisma.machineDocument.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'Đã xóa tài liệu' }
  }
}
