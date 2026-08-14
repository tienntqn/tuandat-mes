import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { PartRequestService } from './part-request.service'
import {
  CreatePartRequestDto,
  UpdatePartRequestDto,
  RejectPartRequestDto,
  ReceivePartRequestDto,
} from './dto/part-request.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('part-requests')
@ApiBearerAuth()
@Controller('part-requests')
export class PartRequestController {
  constructor(private service: PartRequestService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách yêu cầu mua vật tư' })
  @ApiQuery({ name: 'type', required: false, description: 'REPAIR | MAINTENANCE' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'factoryId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('factoryId', new ParseIntPipe({ optional: true })) factoryId?: number,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.service.findAll(user, type, status, factoryId, search, page, pageSize)
  }

  @Get('material-needs/:workPlanId')
  @ApiOperation({ summary: 'Nhu cầu vật tư của một kế hoạch (đối chiếu tồn kho)' })
  materialNeeds(
    @CurrentUser() user: RequestUser,
    @Param('workPlanId', ParseIntPipe) workPlanId: number,
  ) {
    return this.service.materialNeeds(user, workPlanId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết yêu cầu mua vật tư' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Lập yêu cầu mua vật tư' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreatePartRequestDto) {
    return this.service.create(user, dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Cập nhật yêu cầu (khi còn Nháp hoặc bị từ chối)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdatePartRequestDto,
  ) {
    return this.service.update(id, user, dto)
  }

  @Post(':id/submit')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Trình yêu cầu lên giám đốc xưởng' })
  submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.submit(id, user)
  }

  @Post(':id/approve')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Duyệt yêu cầu (xưởng, rồi công ty nếu vượt ngưỡng)' })
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.approve(id, user)
  }

  @Post(':id/reject')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Từ chối yêu cầu' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: RejectPartRequestDto,
  ) {
    return this.service.reject(id, user, dto)
  }

  @Post(':id/receive')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Nhận hàng và nhập kho theo yêu cầu đã duyệt' })
  receive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: ReceivePartRequestDto,
  ) {
    return this.service.receive(id, user, dto)
  }

  @Post(':id/cancel')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Hủy yêu cầu' })
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.cancel(id, user)
  }

  @Delete(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Xóa yêu cầu (chỉ khi còn Nháp)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.remove(id, user)
  }
}
