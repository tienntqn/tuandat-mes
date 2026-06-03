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
import { SizeService } from './size.service'
import { CreateSizeDto, UpdateSizeDto } from './dto/size.dto'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('sizes')
@ApiBearerAuth()
@Controller('sizes')
export class SizeController {
  constructor(private sizeService: SizeService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách size' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.sizeService.findAll(search, page, pageSize)
  }

  @Get('active')
  @ApiOperation({ summary: 'Danh sách size (dropdown)' })
  findAllActive() {
    return this.sizeService.findAllActive()
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sizeService.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER')
  @ApiOperation({ summary: 'Tạo size' })
  create(@Body() dto: CreateSizeDto) {
    return this.sizeService.create(dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER')
  @ApiOperation({ summary: 'Cập nhật size' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSizeDto) {
    return this.sizeService.update(id, dto)
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa size (soft delete)' })
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.sizeService.softDelete(id)
  }

  @Patch(':id/restore')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Khôi phục size' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.sizeService.restore(id)
  }
}
