import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { MachineHandoverService } from './machine-handover.service'
import { CreateHandoverDto, UpdateHandoverDto, RejectHandoverDto } from './dto/machine-handover.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('machine-handovers')
@ApiBearerAuth()
@Controller('machine-handovers')
export class MachineHandoverController {
  constructor(private service: MachineHandoverService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách biên bản bàn giao máy' })
  @ApiQuery({ name: 'type', required: false, description: 'RECEIVE | AFTER_REPAIR | AFTER_MAINTENANCE' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'machineId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('machineId', new ParseIntPipe({ optional: true })) machineId?: number,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.service.findAll(user, type, status, machineId, search, page, pageSize)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết biên bản bàn giao' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Lập biên bản bàn giao máy' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateHandoverDto) {
    return this.service.create(user, dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Cập nhật biên bản (chỉ khi còn Nháp)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateHandoverDto,
  ) {
    return this.service.update(id, user, dto)
  }

  @Post(':id/confirm-sender')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Bên giao xác nhận (bước 1)' })
  confirmSender(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.confirmSender(id, user)
  }

  @Post(':id/confirm-receiver')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Bên nhận xác nhận (bước 2) — hoàn tất bàn giao' })
  confirmReceiver(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.confirmReceiver(id, user)
  }

  @Post(':id/reject')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Từ chối biên bản bàn giao' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: RejectHandoverDto,
  ) {
    return this.service.reject(id, user, dto)
  }

  @Delete(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Xóa biên bản (chỉ khi còn Nháp)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.remove(id, user)
  }
}
