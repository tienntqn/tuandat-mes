import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { CompanyPlanService } from './company-plan.service'
import { CreateCompanyPlanDto, UpdateCompanyPlanDto, BulkCreateCompanyPlanDto } from './dto/company-plan.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('company-plans')
@ApiBearerAuth()
@Controller('company-plans')
export class CompanyPlanController {
  constructor(private service: CompanyPlanService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách kế hoạch cấp công ty' })
  @ApiQuery({ name: 'styleId', required: false, type: Number })
  @ApiQuery({ name: 'poId', required: false, type: Number })
  @ApiQuery({ name: 'factoryId', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('styleId', new ParseIntPipe({ optional: true })) styleId?: number,
    @Query('poId', new ParseIntPipe({ optional: true })) poId?: number,
    @Query('factoryId', new ParseIntPipe({ optional: true })) factoryId?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.service.findAll(user, styleId, poId, factoryId, page, pageSize)
  }

  @Get('po-summary/:poId')
  @ApiOperation({ summary: 'Thống kê phân bổ theo PO' })
  getPOSummary(@Param('poId', ParseIntPipe) poId: number) {
    return this.service.getPOAllocationSummary(poId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết kế hoạch cấp công ty' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER')
  @ApiOperation({ summary: 'Tạo kế hoạch cấp công ty' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCompanyPlanDto) {
    return this.service.create(user, dto)
  }

  @Post('bulk')
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER')
  @ApiOperation({ summary: 'Tạo nhiều kế hoạch cùng lúc (phân bổ 1 PO cho nhiều xưởng)' })
  bulkCreate(@CurrentUser() user: RequestUser, @Body() dto: BulkCreateCompanyPlanDto) {
    return this.service.bulkCreate(user, dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER')
  @ApiOperation({ summary: 'Cập nhật kế hoạch cấp công ty' })
  update(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCompanyPlanDto,
  ) {
    return this.service.update(user, id, dto)
  }

  @Delete(':id')
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER')
  @ApiOperation({ summary: 'Xóa kế hoạch cấp công ty' })
  remove(@CurrentUser() user: RequestUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(user, id)
  }
}
