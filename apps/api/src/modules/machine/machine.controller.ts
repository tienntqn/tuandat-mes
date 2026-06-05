import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { MachineService } from './machine.service'
import { CreateMachineDto, UpdateMachineDto, AssignLineDto, LiquidateMachineDto } from './dto/machine.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('machines')
@ApiBearerAuth()
@Controller('machines')
export class MachineController {
  constructor(private machineService: MachineService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách máy móc' })
  @ApiQuery({ name: 'factoryId', required: false, type: Number })
  @ApiQuery({ name: 'lineId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('factoryId', new ParseIntPipe({ optional: true })) factoryId?: number,
    @Query('lineId', new ParseIntPipe({ optional: true })) lineId?: number,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.machineService.findAll(user, factoryId, lineId, status, type, search, page, pageSize)
  }

  @Get('maintenance-due')
  @ApiOperation({ summary: 'Máy sắp/đã đến hạn bảo dưỡng' })
  @ApiQuery({ name: 'daysAhead', required: false, type: Number })
  getMaintenanceDue(
    @CurrentUser() user: RequestUser,
    @Query('daysAhead', new ParseIntPipe({ optional: true })) daysAhead?: number,
  ) {
    return this.machineService.getMaintenanceDue(user, daysAhead)
  }

  @Get('liquidations')
  @ApiOperation({ summary: 'Danh sách máy đã thanh lý (lịch sử)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findLiquidated(
    @CurrentUser() user: RequestUser,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.machineService.findLiquidated(user, page, pageSize)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết máy' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.machineService.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Thêm máy mới' })
  create(@Body() dto: CreateMachineDto) {
    return this.machineService.create(dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Cập nhật máy' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMachineDto) {
    return this.machineService.update(id, dto)
  }

  @Patch(':id/assign-line')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Gán/gỡ máy khỏi chuyền' })
  assignLine(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignLineDto) {
    return this.machineService.assignLine(id, dto)
  }

  @Post(':id/liquidate')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Thanh lý máy' })
  liquidate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: LiquidateMachineDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.machineService.liquidate(id, dto, user)
  }

  @Delete(':id')
  @Roles('ADMIN', 'BOD')
  @ApiOperation({ summary: 'Xóa máy (soft delete)' })
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.machineService.softDelete(id)
  }
}
