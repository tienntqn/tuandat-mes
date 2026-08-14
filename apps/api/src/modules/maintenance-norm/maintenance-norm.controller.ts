import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { MaintenanceNormService } from './maintenance-norm.service'
import { CreateMaintenanceNormDto, UpdateMaintenanceNormDto } from './dto/maintenance-norm.dto'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('maintenance-norms')
@ApiBearerAuth()
@Controller('maintenance-norms')
export class MaintenanceNormController {
  constructor(private service: MaintenanceNormService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách định mức bảo dưỡng' })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiQuery({ name: 'machineId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @Query('categoryId', new ParseIntPipe({ optional: true })) categoryId?: number,
    @Query('machineId', new ParseIntPipe({ optional: true })) machineId?: number,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.service.findAll(categoryId, machineId, search, page, pageSize)
  }

  @Get('for-machine/:machineId')
  @ApiOperation({ summary: 'Định mức bảo dưỡng áp dụng cho một máy' })
  resolveForMachine(@Param('machineId', ParseIntPipe) machineId: number) {
    return this.service.resolveForMachine(machineId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết định mức bảo dưỡng' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Thêm định mức bảo dưỡng' })
  create(@Body() dto: CreateMaintenanceNormDto) {
    return this.service.create(dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Cập nhật định mức bảo dưỡng' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMaintenanceNormDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Xóa định mức bảo dưỡng' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }
}
