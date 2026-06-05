import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { RepairProposalService } from './repair-proposal.service'
import {
  CreateRepairProposalDto,
  UpdateRepairProposalDto,
  RejectRepairProposalDto,
} from './dto/repair-proposal.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('repair-proposals')
@ApiBearerAuth()
@Controller('repair-proposals')
export class RepairProposalController {
  constructor(private service: RepairProposalService) {}

  @Get()
  @ApiQuery({ name: 'machineId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('machineId', new ParseIntPipe({ optional: true })) machineId?: number,
    @Query('status') status?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.service.findAll(user, machineId, status, page, pageSize)
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Tạo đề xuất (Nháp)' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateRepairProposalDto) {
    return this.service.create(user, dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRepairProposalDto) {
    return this.service.update(id, dto)
  }

  @Patch(':id/submit')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Gửi duyệt' })
  submit(@Param('id', ParseIntPipe) id: number) {
    return this.service.submit(id)
  }

  @Patch(':id/approve')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Duyệt (GĐ Xưởng)' })
  approve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.approve(id, user)
  }

  @Patch(':id/reject')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Từ chối' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectRepairProposalDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.reject(id, dto, user)
  }

  @Patch(':id/complete')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Hoàn thành' })
  complete(@Param('id', ParseIntPipe) id: number) {
    return this.service.complete(id)
  }

  @Delete(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id)
  }
}
