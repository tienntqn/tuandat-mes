import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { BreakdownService } from './breakdown.service'
import {
  CreateBreakdownDto,
  UpdateBreakdownDto,
  CreateIncidentDto,
  UpdateIncidentDto,
} from './dto/breakdown.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('breakdown-reports')
@ApiBearerAuth()
@Controller('breakdown-reports')
export class BreakdownController {
  constructor(private service: BreakdownService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách phiếu báo hỏng' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'machineId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('machineId', new ParseIntPipe({ optional: true })) machineId?: number,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.service.findAll(user, status, severity, machineId, search, page, pageSize)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết phiếu báo hỏng' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Lập phiếu báo hỏng' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateBreakdownDto) {
    return this.service.create(user, dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Cập nhật phiếu báo hỏng' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateBreakdownDto,
  ) {
    return this.service.update(id, user, dto)
  }

  @Post(':id/acknowledge')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Cơ điện tiếp nhận phiếu báo hỏng' })
  acknowledge(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.acknowledge(id, user)
  }

  @Post(':id/resolve')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Đóng phiếu báo hỏng (đã xử lý xong)' })
  resolve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.resolve(id, user)
  }

  @Post(':id/cancel')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Hủy phiếu báo hỏng' })
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.cancel(id, user)
  }
}

@ApiTags('incident-reports')
@ApiBearerAuth()
@Controller('incident-reports')
export class IncidentController {
  constructor(private service: BreakdownService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách biên bản sự cố' })
  @ApiQuery({ name: 'machineId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('machineId', new ParseIntPipe({ optional: true })) machineId?: number,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.service.findIncidents(user, machineId, search, page, pageSize)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết biên bản sự cố' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findIncident(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Lập biên bản sự cố' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateIncidentDto) {
    return this.service.createIncident(user, dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Cập nhật biên bản sự cố' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateIncidentDto,
  ) {
    return this.service.updateIncident(id, user, dto)
  }

  @Delete(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Xóa biên bản sự cố' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.removeIncident(id, user)
  }
}
