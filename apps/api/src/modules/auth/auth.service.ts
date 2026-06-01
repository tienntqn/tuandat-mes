import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'

export interface JwtPayload {
  sub: number
  username: string
  iat?: number
  exp?: number
}

export interface AuthUser {
  id: number
  username: string
  employeeId: number
  fullName: string
  position: string
  factoryId: number | null
  lineId: number | null
  roles: string[]
  permissions: string[]
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        employee: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng')
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash)
    if (!passwordValid) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng')
    }

    const authUser = this.buildAuthUser(user)
    const { accessToken, refreshToken } = this.generateTokens(user.id, user.username)

    return { accessToken, refreshToken, user: authUser }
  }

  async refresh(token: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      })

      // Kiểm tra user vẫn active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      })
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Phiên đăng nhập không hợp lệ')
      }

      const { accessToken, refreshToken } = this.generateTokens(payload.sub, payload.username)
      return { accessToken, refreshToken }
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn')
    }
  }

  async getMe(userId: number): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại')
    }

    return this.buildAuthUser(user)
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    if (newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu mới phải có ít nhất 6 ký tự')
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })

    const valid = await bcrypt.compare(oldPassword, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Mật khẩu cũ không đúng')

    const hash = await bcrypt.hash(newPassword, 10)
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } })

    return { message: 'Đổi mật khẩu thành công' }
  }

  // ── private helpers ──────────────────────────────────────

  private generateTokens(userId: number, username: string) {
    const payload: JwtPayload = { sub: userId, username }

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
    })

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    })

    return { accessToken, refreshToken }
  }

  private buildAuthUser(user: {
    id: number
    username: string
    employeeId: number
    employee: { fullName: string; position: string; factoryId: number | null; lineId: number | null }
    userRoles: Array<{
      role: {
        name: string
        rolePermissions: Array<{ permission: { resource: string; action: string } }>
      }
    }>
  }): AuthUser {
    return {
      id: user.id,
      username: user.username,
      employeeId: user.employeeId,
      fullName: user.employee.fullName,
      position: user.employee.position,
      factoryId: user.employee.factoryId,
      lineId: user.employee.lineId,
      roles: user.userRoles.map((ur) => ur.role.name),
      permissions: [
        ...new Set(
          user.userRoles.flatMap((ur) =>
            ur.role.rolePermissions.map(
              (rp) => `${rp.permission.resource}:${rp.permission.action}`,
            ),
          ),
        ),
      ],
    }
  }
}
