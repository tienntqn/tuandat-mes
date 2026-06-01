import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'
import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from './dto/create-user.dto'

const USER_SELECT = {
  id: true,
  username: true,
  isActive: true,
  createdAt: true,
  employee: {
    select: {
      id: true,
      code: true,
      fullName: true,
      position: true,
      factoryId: true,
      lineId: true,
    },
  },
  userRoles: {
    select: {
      role: { select: { id: true, name: true, description: true } },
    },
  },
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: pageSize,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ])

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    })
    if (!user) throw new NotFoundException('Người dùng không tồn tại')
    return user
  }

  async create(dto: CreateUserDto) {
    // Kiểm tra employee chưa có tài khoản
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.username }, { employeeId: dto.employeeId }],
      },
    })
    if (existing?.username === dto.username) {
      throw new ConflictException('Tên đăng nhập đã tồn tại')
    }
    if (existing?.employeeId === dto.employeeId) {
      throw new ConflictException('Nhân viên này đã có tài khoản')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    const user = await this.prisma.user.create({
      data: {
        employeeId: dto.employeeId,
        username: dto.username,
        passwordHash,
        userRoles: dto.roleIds
          ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
      select: USER_SELECT,
    })

    return user
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id)

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { isActive: dto.isActive },
      })

      if (dto.roleIds !== undefined) {
        // Xóa hết role cũ rồi gán lại
        await tx.userRole.deleteMany({ where: { userId: id } })
        if (dto.roleIds.length > 0) {
          await tx.userRole.createMany({
            data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
          })
        }
      }
    })

    return this.findOne(id)
  }

  async resetPassword(id: number, dto: ResetPasswordDto) {
    await this.findOne(id)
    const hash = await bcrypt.hash(dto.newPassword, 10)
    await this.prisma.user.update({ where: { id }, data: { passwordHash: hash } })
    return { message: 'Đặt lại mật khẩu thành công' }
  }

  async getRoles() {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
      },
      orderBy: { name: 'asc' },
    })
  }
}
