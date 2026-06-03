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
import { ColorService } from './color.service'
import { CreateColorDto, UpdateColorDto } from './dto/color.dto'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('colors')
@ApiBearerAuth()
@Controller('colors')
export class ColorController {
  constructor(private colorService: ColorService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách màu' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.colorService.findAll(search, page, pageSize)
  }

  @Get('active')
  @ApiOperation({ summary: 'Danh sách màu (dropdown)' })
  findAllActive() {
    return this.colorService.findAllActive()
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.colorService.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER')
  @ApiOperation({ summary: 'Tạo màu' })
  create(@Body() dto: CreateColorDto) {
    return this.colorService.create(dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'COMPANY_PLANNER')
  @ApiOperation({ summary: 'Cập nhật màu' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateColorDto) {
    return this.colorService.update(id, dto)
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa màu (soft delete)' })
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.colorService.softDelete(id)
  }

  @Patch(':id/restore')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Khôi phục màu' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.colorService.restore(id)
  }
}
