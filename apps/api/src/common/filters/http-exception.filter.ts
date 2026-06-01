import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    let message: string | string[]
    if (exception instanceof HttpException) {
      const res = exception.getResponse()
      message =
        typeof res === 'object' && 'message' in (res as object)
          ? (res as { message: string | string[] }).message
          : exception.message
    } else {
      this.logger.error(exception)
      message = 'Đã có lỗi xảy ra, vui lòng thử lại sau'
    }

    response.status(status).json({
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
      path: request.url,
      timestamp: new Date().toISOString(),
    })
  }
}
