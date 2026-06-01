import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateMaintenanceDto } from './dto/maintenance.dto'

@Injectable()
export class MachineMaintenanceService {
  constructor(private prisma: PrismaService) {}

  async findByMachine(machineId: number, page = 1, pageSize = 20) {
    const machine = await this.prisma.machine.findFirst({ where: { id: machineId, deletedAt: null } })
    if (!machine) throw new NotFoundException('Máy không tồn tại')

    const where = { machineId }
    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.machineMaintenance.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { maintenanceDate: 'desc' },
        include: { machine: { select: { id: true, code: true, name: true } } },
      }),
      this.prisma.machineMaintenance.count({ where }),
    ])

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async create(dto: CreateMaintenanceDto) {
    const machine = await this.prisma.machine.findFirst({ where: { id: dto.machineId, deletedAt: null } })
    if (!machine) throw new NotFoundException('Máy không tồn tại')

    const record = await this.prisma.machineMaintenance.create({
      data: {
        machineId: dto.machineId,
        maintenanceDate: new Date(dto.maintenanceDate),
        type: dto.type,
        description: dto.description,
        performedBy: dto.performedBy,
        cost: dto.cost,
        nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : null,
      },
      include: { machine: { select: { id: true, code: true, name: true } } },
    })

    // Cập nhật trạng thái máy về RUNNING sau bảo dưỡng
    if (machine.status === 'MAINTENANCE') {
      await this.prisma.machine.update({ where: { id: dto.machineId }, data: { status: 'RUNNING' } })
    }

    return record
  }
}
