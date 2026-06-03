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
import { DeliveryPlanService } from './delivery-plan.service'
import { CreateDeliveryPlanDto, UpdateDeliveryPlanDto } from './dto/delivery-plan.dto'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('delivery-plans')
@ApiBearerAuth()
@Controller('delivery-plans')
export class DeliveryPlanController {
  constructor(private service: DeliveryPlanService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách kế hoạch giao hàng' })
  @ApiQuery({ name: 'poId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @Query('poId', new ParseIntPipe({ optional: true })) poId?: number,
    @Query('status') status?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.service.findAll(poId, status, page, pageSize)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết kế hoạch giao hàng' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_PLANNER')
  @ApiOperation({ summary: 'Tạo kế hoạch giao hàng' })
  create(@Body() dto: CreateDeliveryPlanDto) {
    return this.service.create(dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_PLANNER')
  @ApiOperation({ summary: 'Cập nhật kế hoạch giao hàng' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDeliveryPlanDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa kế hoạch giao hàng (soft delete)' })
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.service.softDelete(id)
  }

  @Patch(':id/restore')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Khôi phục kế hoạch giao hàng' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.service.restore(id)
  }
}
