import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import type { JwtPayload } from '../auth.service'
import type { RequestUser } from '../../../common/types/request-user.type'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow('JWT_ACCESS_SECRET'),
    })
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
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
      throw new UnauthorizedException('Phiên đăng nhập hết hạn')
    }

    // Tính data scope từ position
    const position = user.employee.position
    let dataScope: RequestUser['dataScope']

    const lineScoped = ['LINE_LEADER', 'LINE_DEPUTY']
    const factoryScoped = ['FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'MECHANIC']

    if (lineScoped.includes(position)) {
      dataScope = { type: 'LINE', lineId: user.employee.lineId! }
    } else if (factoryScoped.includes(position)) {
      dataScope = { type: 'FACTORY', factoryId: user.employee.factoryId! }
    } else {
      dataScope = { type: 'COMPANY' }
    }

    return {
      id: user.id,
      username: user.username,
      employeeId: user.employeeId,
      position,
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
      dataScope,
    }
  }
}
