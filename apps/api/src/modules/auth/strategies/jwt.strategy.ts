import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
    })
  }

  async validate(payload: { sub: number; username: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        employee: true,
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
      },
    })

    if (!user || !user.isActive) return null

    // Tính data scope dựa trên position
    return {
      id: user.id,
      username: user.username,
      employeeId: user.employeeId,
      position: user.employee.position,
      factoryId: user.employee.factoryId,
      lineId: user.employee.lineId,
      roles: user.userRoles.map((ur) => ur.role.name),
      permissions: user.userRoles.flatMap((ur) =>
        ur.role.rolePermissions.map((rp) => `${rp.permission.resource}:${rp.permission.action}`),
      ),
    }
  }
}
