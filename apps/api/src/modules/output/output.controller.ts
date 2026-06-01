import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { OutputService } from './output.service'
import { CreateDailyOutputDto } from './dto/output.dto'
import type { RequestUser } from '../../common/types/request-user.type'

@Controller('output')
@UseGuards(JwtAuthGuard)
export class OutputController {
  constructor(private readonly outputService: OutputService) {}

  // Lấy settings cutoff time
  @Get('settings')
  getSettings() {
    return this.outputService.getSettings()
  }

  // Lấy danh sách mã hàng của chuyền (cho tổ trưởng chọn khi nhập)
  @Get('styles')
  getMyStyles(@CurrentUser() user: RequestUser) {
    const lineId = user.lineId
    if (!lineId) return []
    return this.outputService.getStylesForLine(lineId)
  }

  // Lấy sản lượng hôm nay của chuyền đang đăng nhập
  @Get('today')
  getToday(@CurrentUser() user: RequestUser) {
    const lineId = user.lineId
    if (!lineId) {
      return { date: new Date(), isPastCutoff: false, cutoffHour: 19, outputs: [], factoryPlans: [] }
    }
    return this.outputService.getTodayOutput(lineId)
  }

  // Lấy lịch sử N ngày gần nhất
  @Get('history')
  getHistory(
    @CurrentUser() user: RequestUser,
    @Query('days') days?: string,
    @Query('lineId') lineId?: string,
  ) {
    const targetLineId = lineId ? parseInt(lineId) : user.lineId
    if (!targetLineId) return []
    return this.outputService.getHistory(targetLineId, days ? parseInt(days) : 7)
  }

  // Lấy audit log của 1 output
  @Get(':id/logs')
  getLogs(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    return this.outputService.getOutputLogs(id, user)
  }

  // Nhập / upsert sản lượng
  @Post()
  upsert(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateDailyOutputDto,
  ) {
    return this.outputService.upsertOutput(user, dto)
  }
}
