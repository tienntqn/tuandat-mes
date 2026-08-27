import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateCartonTypeDto, UpdateCartonTypeDto } from './dto/carton-type.dto'

@Injectable()
export class CartonTypeService {
  constructor(private prisma: PrismaService) {}

  async findAllByCustomer(customerId: number) {
    return this.prisma.cartonType.findMany({
      where: { customerId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })
  }

  async create(dto: CreateCartonTypeDto) {
    return this.prisma.cartonType.create({ data: dto })
  }

  async update(id: number, dto: UpdateCartonTypeDto) {
    const existing = await this.prisma.cartonType.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new NotFoundException('Không tìm thấy loại thùng')
    return this.prisma.cartonType.update({ where: { id }, data: dto })
  }

  async remove(id: number) {
    const existing = await this.prisma.cartonType.findFirst({ where: { id, deletedAt: null } })
    if (!existing) throw new NotFoundException('Không tìm thấy loại thùng')
    await this.prisma.cartonType.update({ where: { id }, data: { deletedAt: new Date() } })
    return { success: true }
  }
}
