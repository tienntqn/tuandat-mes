import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { RequestUser, DataScope } from '../types/request-user.type'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser =>
    ctx.switchToHttp().getRequest().user,
)

export const GetDataScope = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DataScope =>
    ctx.switchToHttp().getRequest().user?.dataScope,
)
