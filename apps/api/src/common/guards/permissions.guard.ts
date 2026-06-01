import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator'
import type { RequestUser } from '../types/request-user.type'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!required || required.length === 0) return true

    const user: RequestUser = context.switchToHttp().getRequest().user
    if (!user) return false

    if (user.roles.includes('ADMIN')) return true

    const hasAll = required.every((p) => user.permissions.includes(p))
    if (!hasAll) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này')
    }

    return true
  }
}
