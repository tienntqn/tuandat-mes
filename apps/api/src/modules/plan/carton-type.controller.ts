import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { CartonTypeService } from './carton-type.service'
import { CreateCartonTypeDto, UpdateCartonTypeDto } from './dto/carton-type.dto'
import { Roles } from '../../common/decorators/roles.decorator'

const R_FACTORY_PLAN = ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY']

@ApiTags('plan')
@ApiBearerAuth()
@Controller('plan/carton-types')
@Roles(...R_FACTORY_PLAN)
export class CartonTypeController {
  constructor(private readonly service: CartonTypeService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách loại thùng carton của 1 khách hàng' })
  @ApiQuery({ name: 'customerId', required: true, type: Number })
  findAllByCustomer(@Query('customerId', ParseIntPipe) customerId: number) {
    return this.service.findAllByCustomer(customerId)
  }

  @Post()
  @ApiOperation({ summary: 'Thêm loại thùng carton mới cho khách hàng' })
  create(@Body() dto: CreateCartonTypeDto) {
    return this.service.create(dto)
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật loại thùng carton' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCartonTypeDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa (mềm) loại thùng carton' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }
}
