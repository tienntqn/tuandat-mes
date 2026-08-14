import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { WorkOrderService } from './work-order.service'
import { CreateWorkOrderDto, UpdateWorkOrderDto, CompleteWorkOrderDto } from './dto/work-order.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('work-orders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrderController {
  constructor(private service: WorkOrderService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách phiếu sửa chữa / bảo dưỡng' })
  @ApiQuery({ name: 'type', required: false, description: 'REPAIR | MAINTENANCE' })
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
  @ApiOperation({ summary: 'Chi tiết phiếu' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Lập phiếu sửa chữa / bảo dưỡng' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateWorkOrderDto) {
    return this.service.create(user, dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Cập nhật phiếu' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.service.update(id, user, dto)
  }

  @Post(':id/start')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Bắt đầu thực hiện' })
  start(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.start(id, user)
  }

  @Post(':id/complete')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Hoàn thành — chốt vật tư, trừ kho và tính chi phí' })
  complete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: CompleteWorkOrderDto,
  ) {
    return this.service.complete(id, user, dto)
  }

  @Post(':id/cancel')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Hủy phiếu' })
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.cancel(id, user)
  }

  @Delete(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Xóa phiếu (chỉ khi còn Nháp)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.remove(id, user)
  }
}
