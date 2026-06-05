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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { MachineCategoryService } from './machine-category.service'
import { CreateMachineCategoryDto, UpdateMachineCategoryDto } from './dto/machine-category.dto'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('machine-categories')
@ApiBearerAuth()
@Controller('machine-categories')
export class MachineCategoryController {
  constructor(private service: MachineCategoryService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.service.findAll(search, page, pageSize)
  }

  @Get('active')
  findAllActive() {
    return this.service.findAllActive()
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  create(@Body() dto: CreateMachineCategoryDto) {
    return this.service.create(dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMachineCategoryDto) {
    return this.service.update(id, dto)
  }

  @Delete(':id')
  @Roles('ADMIN', 'MECHANIC')
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.service.softDelete(id)
  }

  @Patch(':id/restore')
  @Roles('ADMIN', 'MECHANIC')
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.service.restore(id)
  }
}
