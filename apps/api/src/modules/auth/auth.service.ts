import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'

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
        userRoles: { include: { role: true } },
      },
    })

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng')
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash)
    if (!passwordValid) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng')
    }

    const payload = { sub: user.id, username: user.username }
    const accessToken = this.jwtService.sign(payload)
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    })

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        employeeId: user.employeeId,
        fullName: user.employee.fullName,
        position: user.employee.position,
        factoryId: user.employee.factoryId,
        lineId: user.employee.lineId,
        roles: user.userRoles.map((ur) => ur.role.name),
      },
    }
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      })
      const newAccessToken = this.jwtService.sign({ sub: payload.sub, username: payload.username })
      return { accessToken: newAccessToken, refreshToken: token }
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ')
    }
  }
}
