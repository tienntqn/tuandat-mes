import {
  Controller,
  Get,
  Query,
  Sse,
  UseGuards,
  MessageEvent,
  ParseIntPipe,
  Optional,
} from '@nestjs/common'
import { Observable, interval, switchMap, from } from 'rxjs'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { ReportService } from './report.service'
import type { RequestUser } from '../../common/types/request-user.type'

@Controller('report')
@UseGuards(JwtAuthGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // Báo cáo tiến độ (filter: factoryId, styleId, stage)
  @Get('progress')
  getProgress(
    @CurrentUser() user: RequestUser,
    @Query('factoryId') factoryId?: string,
    @Query('styleId') styleId?: string,
    @Query('stage') stage?: string,
  ) {
    return this.reportService.getProgressReport(
      user,
      factoryId ? parseInt(factoryId) : undefined,
      styleId ? parseInt(styleId) : undefined,
      stage,
    )
  }

  // Báo cáo tiến độ bóc tách theo Màu × Size (filter: styleId, stage)
  @Get('color-size')
  getColorSize(
    @CurrentUser() user: RequestUser,
    @Query('styleId') styleId?: string,
    @Query('stage') stage?: string,
  ) {
    return this.reportService.getColorSizeReport(
      user,
      styleId ? parseInt(styleId) : undefined,
      stage,
    )
  }

  // KPI tổng hợp cho Dashboard BGĐ
  @Get('kpi')
  getKpi(@CurrentUser() user: RequestUser) {
    return this.reportService.getKpi(user)
  }

  // Cảnh báo hệ thống
  @Get('alerts')
  getAlerts(@CurrentUser() user: RequestUser) {
    return this.reportService.getAlerts(user)
  }

  // Settings
  @Get('settings')
  getSettings() {
    return this.reportService.getSettings()
  }

  // SSE: push KPI update mỗi 30 giây cho Dashboard real-time
  @Sse('stream/kpi')
  streamKpi(@CurrentUser() user: RequestUser): Observable<MessageEvent> {
    return interval(30_000).pipe(
      switchMap(() => from(this.reportService.getKpi(user))),
      switchMap((kpi) =>
        new Observable<MessageEvent>((obs) => {
          obs.next({ data: JSON.stringify(kpi) } as MessageEvent)
          obs.complete()
        }),
      ),
    )
  }
}
