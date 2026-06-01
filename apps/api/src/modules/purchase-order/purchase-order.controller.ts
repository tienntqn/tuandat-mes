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
import { PurchaseOrderService } from './purchase-order.service'
import { CreatePurchaseOrderDto, UpdatePurchaseOrderDto } from './dto/purchase-order.dto'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('purchase-orders')
@ApiBearerAuth()
@Controller('purchase-orders')
export class PurchaseOrderController {
  constructor(private poService: PurchaseOrderService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách PO' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'styleId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @Query('search') search?: string,
    @Query('styleId', new ParseIntPipe({ optional: true })) styleId?: number,
    @Query('status') status?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.poService.findAll(search, styleId, status, page, pageSize)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết PO' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.poService.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER')
  @ApiOperation({ summary: 'Tạo PO' })
  create(@Body() dto: CreatePurchaseOrderDto) {
    return this.poService.create(dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER')
  @ApiOperation({ summary: 'Cập nhật PO' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePurchaseOrderDto) {
    return this.poService.update(id, dto)
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa PO (soft delete)' })
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.poService.softDelete(id)
  }

  @Patch(':id/restore')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Khôi phục PO' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.poService.restore(id)
  }
}
