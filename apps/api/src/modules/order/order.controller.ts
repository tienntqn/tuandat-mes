import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { OrderService } from './order.service'
import { CreateOrderDto, UpdateOrderDto } from './dto/order.dto'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách đơn đặt hàng' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'customerId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @Query('search') search?: string,
    @Query('customerId', new ParseIntPipe({ optional: true })) customerId?: number,
    @Query('status') status?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.orderService.findAll(search, customerId, status, page, pageSize)
  }

  @Get('active')
  @ApiOperation({ summary: 'Đơn hàng đang mở (dropdown)' })
  active() {
    return this.orderService.active()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết đơn hàng' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER')
  @ApiOperation({ summary: 'Tạo đơn hàng' })
  create(@Body() dto: CreateOrderDto) {
    return this.orderService.create(dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER')
  @ApiOperation({ summary: 'Cập nhật đơn hàng' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto) {
    return this.orderService.update(id, dto)
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa đơn hàng (soft delete)' })
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.softDelete(id)
  }

  @Patch(':id/restore')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Khôi phục đơn hàng' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.restore(id)
  }
}
