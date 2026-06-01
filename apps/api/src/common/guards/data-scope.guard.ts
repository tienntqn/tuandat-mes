import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { RequestUser } from '../types/request-user.type'

export const SCOPE_RESOURCE_KEY = 'scopeResource'

/**
 * Guard kiểm tra data scope khi truy cập resource thuộc factory/line cụ thể.
 * Sử dụng: @SetMetadata(SCOPE_RESOURCE_KEY, 'factory') + @UseGuards(DataScopeGuard)
 *
 * Request phải có query/param: factoryId hoặc lineId để guard so sánh với scope.
 * Các endpoint không truyền id (danh sách) sẽ được filter ở service layer.
 */
@Injectable()
export class DataScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const user: RequestUser = context.switchToHttp().getRequest().user
    if (!user) return false

    const { dataScope } = user

    // COMPANY scope: không cần lọc
    if (dataScope.type === 'COMPANY') return true

    const req = context.switchToHttp().getRequest()
    const factoryIdParam =
      parseInt(req.params?.factoryId ?? req.query?.factoryId ?? req.body?.factoryId) || null
    const lineIdParam =
      parseInt(req.params?.lineId ?? req.query?.lineId ?? req.body?.lineId) || null

    if (dataScope.type === 'FACTORY' && factoryIdParam) {
      if (factoryIdParam !== dataScope.factoryId) {
        throw new ForbiddenException('Bạn chỉ có quyền truy cập dữ liệu xưởng của mình')
      }
    }

    if (dataScope.type === 'LINE' && lineIdParam) {
      if (lineIdParam !== dataScope.lineId) {
        throw new ForbiddenException('Bạn chỉ có quyền truy cập dữ liệu chuyền của mình')
      }
    }

    return true
  }
}

/**
 * Helper: lọc where clause Prisma theo data scope.
 * Dùng trong service: const scopeFilter = buildScopeFilter(user.dataScope)
 * Sau đó: prisma.dailyOutput.findMany({ where: { ...scopeFilter, ...otherWhere } })
 */
export function buildScopeFilter(
  scope: RequestUser['dataScope'],
): { factoryId?: number; lineId?: number; line?: { factoryId: number } } {
  if (scope.type === 'LINE') {
    return { lineId: scope.lineId }
  }
  if (scope.type === 'FACTORY') {
    return { line: { factoryId: scope.factoryId } }
  }
  return {}
}

export function buildFactoryScopeFilter(
  scope: RequestUser['dataScope'],
): { id?: number } {
  if (scope.type === 'FACTORY') return { id: scope.factoryId }
  if (scope.type === 'LINE') return {}
  return {}
}
