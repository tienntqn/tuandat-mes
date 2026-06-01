import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { FactoryPlanService } from './factory-plan.service'
import { CreateFactoryPlanDto, UpdateFactoryPlanDto, BulkCreateFactoryPlanDto } from './dto/factory-plan.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('factory-plans')
@ApiBearerAuth()
@Controller('factory-plans')
export class FactoryPlanController {
  constructor(private service: FactoryPlanService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách kế hoạch cấp xưởng' })
  @ApiQuery({ name: 'companyPlanId', required: false, type: Number })
  @ApiQuery({ name: 'lineId', required: false, type: Number })
  @ApiQuery({ name: 'factoryId', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('companyPlanId', new ParseIntPipe({ optional: true })) companyPlanId?: number,
    @Query('lineId', new ParseIntPipe({ optional: true })) lineId?: number,
    @Query('factoryId', new ParseIntPipe({ optional: true })) factoryId?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.service.findAll(user, companyPlanId, lineId, factoryId, page, pageSize)
  }

  @Get('company-plan-progress/:companyPlanId')
  @ApiOperation({ summary: 'Tiến độ phân bổ của 1 CompanyPlan xuống các chuyền' })
  getProgress(@Param('companyPlanId', ParseIntPipe) companyPlanId: number) {
    return this.service.getCompanyPlanProgress(companyPlanId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết kế hoạch cấp xưởng' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER')
  @ApiOperation({ summary: 'Tạo kế hoạch cấp xưởng (phân chuyền)' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateFactoryPlanDto) {
    return this.service.create(user, dto)
  }

  @Post('bulk')
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER')
  @ApiOperation({ summary: 'Phân bổ nhiều chuyền cùng lúc' })
  bulkCreate(@CurrentUser() user: RequestUser, @Body() dto: BulkCreateFactoryPlanDto) {
    return this.service.bulkCreate(user, dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER')
  @ApiOperation({ summary: 'Cập nhật kế hoạch cấp xưởng' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFactoryPlanDto,
  ) {
    return this.service.update(user, id, dto)
  }

  @Delete(':id')
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER')
  @ApiOperation({ summary: 'Xóa kế hoạch cấp xưởng' })
  remove(@CurrentUser() user: RequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(user, id)
  }
}
