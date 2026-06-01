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
import { StyleService } from './style.service'
import { CreateStyleDto, UpdateStyleDto } from './dto/style.dto'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('styles')
@ApiBearerAuth()
@Controller('styles')
export class StyleController {
  constructor(private styleService: StyleService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách mã hàng' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'customerId', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @Query('search') search?: string,
    @Query('customerId', new ParseIntPipe({ optional: true })) customerId?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.styleService.findAll(search, customerId, page, pageSize)
  }

  @Get('active')
  @ApiOperation({ summary: 'Danh sách mã hàng (dropdown)' })
  findAllActive() {
    return this.styleService.findAllActive()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết mã hàng' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.styleService.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER')
  @ApiOperation({ summary: 'Tạo mã hàng' })
  create(@Body() dto: CreateStyleDto) {
    return this.styleService.create(dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER')
  @ApiOperation({ summary: 'Cập nhật mã hàng' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStyleDto) {
    return this.styleService.update(id, dto)
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa mã hàng (soft delete)' })
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.styleService.softDelete(id)
  }

  @Patch(':id/restore')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Khôi phục mã hàng' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.styleService.restore(id)
  }
}
