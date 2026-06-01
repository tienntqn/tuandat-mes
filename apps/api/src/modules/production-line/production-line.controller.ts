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
import { ProductionLineService } from './production-line.service'
import { CreateProductionLineDto, UpdateProductionLineDto } from './dto/production-line.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('production-lines')
@ApiBearerAuth()
@Controller('production-lines')
export class ProductionLineController {
  constructor(private lineService: ProductionLineService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách chuyền' })
  @ApiQuery({ name: 'factoryId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('factoryId', new ParseIntPipe({ optional: true })) factoryId?: number,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.lineService.findAll(user, factoryId, search, page, pageSize)
  }

  @Get('by-factory/:factoryId')
  @ApiOperation({ summary: 'Danh sách chuyền theo xưởng (dropdown)' })
  findByFactory(@Param('factoryId', ParseIntPipe) factoryId: number) {
    return this.lineService.findAllByFactory(factoryId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết chuyền' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lineService.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Tạo chuyền mới' })
  create(@Body() dto: CreateProductionLineDto) {
    return this.lineService.create(dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Cập nhật chuyền' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductionLineDto) {
    return this.lineService.update(id, dto)
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa chuyền (soft delete)' })
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.lineService.softDelete(id)
  }

  @Patch(':id/restore')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Khôi phục chuyền' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.lineService.restore(id)
  }
}
