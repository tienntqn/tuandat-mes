import { Controller, Get, Post, Delete, Body, Param, Query, ParseIntPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { ContainerLoadingService } from './container-loading.service'
import { CreateContainerLoadingPlanDto } from './dto/container-loading.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

const R_FACTORY_PLAN = ['ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER', 'LINE_LEADER', 'LINE_DEPUTY']

@ApiTags('plan')
@ApiBearerAuth()
@Controller('plan/container-loading')
@Roles(...R_FACTORY_PLAN)
export class ContainerLoadingController {
  constructor(private readonly service: ContainerLoadingService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách lịch sử xếp container' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.service.findAll(page, pageSize)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết 1 lần xếp container (đầy đủ danh sách thùng + kết quả)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: 'Lưu kết quả xếp container vào lịch sử' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateContainerLoadingPlanDto) {
    return this.service.create(user, dto)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa (mềm) 1 bản ghi lịch sử xếp container' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }
}
