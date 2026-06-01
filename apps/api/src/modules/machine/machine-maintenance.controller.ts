import { Controller, Get, Post, Body, Param, Query, ParseIntPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { MachineMaintenanceService } from './machine-maintenance.service'
import { CreateMaintenanceDto } from './dto/maintenance.dto'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('machine-maintenances')
@ApiBearerAuth()
@Controller('machine-maintenances')
export class MachineMaintenanceController {
  constructor(private maintenanceService: MachineMaintenanceService) {}

  @Get()
  @ApiOperation({ summary: 'Lịch sử bảo dưỡng theo máy' })
  @ApiQuery({ name: 'machineId', required: true, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findByMachine(
    @Query('machineId', ParseIntPipe) machineId: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.maintenanceService.findByMachine(machineId, page, pageSize)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Ghi nhận bảo dưỡng máy' })
  create(@Body() dto: CreateMaintenanceDto) {
    return this.maintenanceService.create(dto)
  }
}
