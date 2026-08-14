import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { MaintenanceRequestService } from './maintenance-request.service'
import { WorkPlanService } from './work-plan.service'
import {
  CreateMaintenanceRequestDto,
  UpdateMaintenanceRequestDto,
  CreateWorkPlanDto,
  UpdateWorkPlanDto,
  RejectDto,
} from './dto/maintenance-plan.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('maintenance-requests')
@ApiBearerAuth()
@Controller('maintenance-requests')
export class MaintenanceRequestController {
  constructor(private service: MaintenanceRequestService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách phiếu yêu cầu bảo dưỡng' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'machineId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: string,
    @Query('machineId', new ParseIntPipe({ optional: true })) machineId?: number,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.service.findAll(user, status, machineId, search, page, pageSize)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết phiếu yêu cầu bảo dưỡng' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Lập phiếu yêu cầu bảo dưỡng' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateMaintenanceRequestDto) {
    return this.service.create(user, dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Cập nhật phiếu yêu cầu' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateMaintenanceRequestDto,
  ) {
    return this.service.update(id, user, dto)
  }

  @Post(':id/accept')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Tiếp nhận yêu cầu bảo dưỡng' })
  accept(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.accept(id, user)
  }

  @Post(':id/reject')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Từ chối yêu cầu bảo dưỡng' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: RejectDto,
  ) {
    return this.service.reject(id, user, dto)
  }

  @Delete(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Xóa phiếu yêu cầu' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.remove(id, user)
  }
}

@ApiTags('work-plans')
@ApiBearerAuth()
@Controller('work-plans')
export class WorkPlanController {
  constructor(private service: WorkPlanService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách kế hoạch sửa chữa / bảo dưỡng' })
  @ApiQuery({ name: 'type', required: false, description: 'REPAIR | MAINTENANCE' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'factoryId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('factoryId', new ParseIntPipe({ optional: true })) factoryId?: number,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.service.findAll(user, type, status, factoryId, search, page, pageSize)
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Dự tính kế hoạch bảo dưỡng theo định mức và lần bảo dưỡng cuối' })
  @ApiQuery({ name: 'daysAhead', required: false, type: Number })
  @ApiQuery({ name: 'factoryId', required: false, type: Number })
  forecast(
    @CurrentUser() user: RequestUser,
    @Query('daysAhead', new ParseIntPipe({ optional: true })) daysAhead?: number,
    @Query('factoryId', new ParseIntPipe({ optional: true })) factoryId?: number,
  ) {
    return this.service.forecast(user, daysAhead, factoryId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết kế hoạch' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Lập kế hoạch sửa chữa / bảo dưỡng' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateWorkPlanDto) {
    return this.service.create(user, dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Cập nhật kế hoạch (khi còn Nháp hoặc bị từ chối)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateWorkPlanDto,
  ) {
    return this.service.update(id, user, dto)
  }

  @Post(':id/submit')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Trình kế hoạch lên giám đốc xưởng' })
  submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.submit(id, user)
  }

  @Post(':id/approve')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Duyệt kế hoạch (xưởng, rồi công ty nếu vượt ngưỡng)' })
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.approve(id, user)
  }

  @Post(':id/reject')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Từ chối kế hoạch' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: RejectDto,
  ) {
    return this.service.reject(id, user, dto)
  }

  @Post(':id/start')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Bắt đầu triển khai kế hoạch' })
  start(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.setProgress(id, user, 'IN_PROGRESS')
  }

  @Post(':id/complete')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Kết thúc kế hoạch' })
  complete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.setProgress(id, user, 'COMPLETED')
  }

  @Post(':id/cancel')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Hủy kế hoạch' })
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.cancel(id, user)
  }

  @Delete(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Xóa kế hoạch (chỉ khi còn Nháp)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.remove(id, user)
  }
}
