import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import type { RequestUser } from '../types/request-user.type'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) return true

    const user: RequestUser = context.switchToHttp().getRequest().user
    if (!user) return false

    // ADMIN luôn có quyền
    if (user.roles.includes('ADMIN')) return true

    const hasRole = requiredRoles.some((r) => user.roles.includes(r))
    if (!hasRole) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này')
    }

    return true
  }
}
