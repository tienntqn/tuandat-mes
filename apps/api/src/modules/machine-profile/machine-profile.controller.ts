import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { MachineProfileService } from './machine-profile.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('machine-profile')
@ApiBearerAuth()
@Controller('machine-profile')
export class MachineProfileController {
  constructor(private service: MachineProfileService) {}

  @Get('alerts')
  @ApiOperation({ summary: 'Cảnh báo cho bộ phận cơ điện (việc cần xử lý)' })
  alerts(@CurrentUser() user: RequestUser) {
    return this.service.alerts(user)
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Thống kê hoạt động máy móc (hỏng hóc, downtime, chi phí)' })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'factoryId', required: false, type: Number })
  statistics(
    @CurrentUser() user: RequestUser,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('factoryId', new ParseIntPipe({ optional: true })) factoryId?: number,
  ) {
    return this.service.statistics(user, fromDate, toDate, factoryId)
  }

  @Get(':machineId/timeline')
  @ApiOperation({ summary: 'Lý lịch máy — toàn bộ sự kiện theo thời gian' })
  timeline(@CurrentUser() user: RequestUser, @Param('machineId', ParseIntPipe) machineId: number) {
    return this.service.timeline(user, machineId)
  }
}
