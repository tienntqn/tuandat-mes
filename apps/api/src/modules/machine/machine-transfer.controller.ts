import {
  Controller, Get, Post, Patch,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { MachineTransferService } from './machine-transfer.service'
import { CreateTransferDto, RejectTransferDto } from './dto/transfer.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('machine-transfers')
@ApiBearerAuth()
@Controller('machine-transfers')
export class MachineTransferController {
  constructor(private transferService: MachineTransferService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách lệnh điều chuyển' })
  @ApiQuery({ name: 'machineId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('machineId', new ParseIntPipe({ optional: true })) machineId?: number,
    @Query('status') status?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.transferService.findAll(user, machineId, status, page, pageSize)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết lệnh điều chuyển' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.transferService.findOne(id)
  }

  @Get('machine/:machineId/history')
  @ApiOperation({ summary: 'Lịch sử điều chuyển của máy (timeline)' })
  getMachineHistory(@Param('machineId', ParseIntPipe) machineId: number) {
    return this.transferService.getMachineHistory(machineId)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Tạo lệnh điều chuyển máy' })
  create(@Body() dto: CreateTransferDto) {
    return this.transferService.create(dto)
  }

  @Patch(':id/confirm-sender')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Bên ĐƯA xác nhận lệnh chuyển' })
  confirmSender(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.transferService.confirmSender(id, user)
  }

  @Patch(':id/confirm-receiver')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Bên NHẬN xác nhận → máy chuyển xưởng' })
  confirmReceiver(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.transferService.confirmReceiver(id, user)
  }

  @Patch(':id/reject')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Từ chối lệnh điều chuyển' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectTransferDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.transferService.reject(id, dto, user)
  }
}
