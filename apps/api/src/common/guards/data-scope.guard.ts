import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'

/**
 * Guard tự động inject data scope vào request dựa trên position của user.
 * LINE_LEADER/LINE_DEPUTY: chỉ thấy dữ liệu lineId của mình.
 * FACTORY_*: chỉ thấy dữ liệu factoryId của mình.
 * COMPANY_PLANNER/BOD/ADMIN: toàn bộ dữ liệu.
 */
@Injectable()
export class DataScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    if (!user) return false

    const lineScoped = ['LINE_LEADER', 'LINE_DEPUTY']
    const factoryScoped = ['FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'MECHANIC']

    if (lineScoped.includes(user.position)) {
      request.dataScope = { type: 'LINE', lineId: user.lineId }
    } else if (factoryScoped.includes(user.position)) {
      request.dataScope = { type: 'FACTORY', factoryId: user.factoryId }
    } else {
      request.dataScope = { type: 'COMPANY' }
    }

    return true
  }
}
