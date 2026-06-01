import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateCompanyDto } from './dto/company.dto'

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async findOne() {
    const company = await this.prisma.company.findFirst({
      where: { deletedAt: null },
    })
    if (!company) throw new NotFoundException('Chưa có thông tin công ty')
    return company
  }

  async update(dto: UpdateCompanyDto) {
    const company = await this.prisma.company.findFirst({ where: { deletedAt: null } })
    if (!company) throw new NotFoundException('Chưa có thông tin công ty')

    return this.prisma.company.update({
      where: { id: company.id },
      data: dto,
    })
  }
}
