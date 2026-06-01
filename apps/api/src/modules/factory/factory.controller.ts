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
import { FactoryService } from './factory.service'
import { CreateFactoryDto, UpdateFactoryDto } from './dto/factory.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('factories')
@ApiBearerAuth()
@Controller('factories')
export class FactoryController {
  constructor(private factoryService: FactoryService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách xưởng' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.factoryService.findAll(user, search, status, page, pageSize)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết xưởng' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.factoryService.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD')
  @ApiOperation({ summary: 'Tạo xưởng mới' })
  create(@Body() dto: CreateFactoryDto) {
    return this.factoryService.create(dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD')
  @ApiOperation({ summary: 'Cập nhật xưởng' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFactoryDto) {
    return this.factoryService.update(id, dto)
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa xưởng (soft delete)' })
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.factoryService.softDelete(id)
  }

  @Patch(':id/restore')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Khôi phục xưởng' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.factoryService.restore(id)
  }
}
