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
import { EmployeeService } from './employee.service'
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('employees')
@ApiBearerAuth()
@Controller('employees')
export class EmployeeController {
  constructor(private employeeService: EmployeeService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách nhân viên' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'factoryId', required: false, type: Number })
  @ApiQuery({ name: 'position', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('search') search?: string,
    @Query('factoryId', new ParseIntPipe({ optional: true })) factoryId?: number,
    @Query('position') position?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.employeeService.findAll(user, search, factoryId, position, page, pageSize)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết nhân viên' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.employeeService.findOne(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD')
  @ApiOperation({ summary: 'Tạo nhân viên mới' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeeService.create(dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Cập nhật nhân viên' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmployeeDto) {
    return this.employeeService.update(id, dto)
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xóa nhân viên (soft delete)' })
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.employeeService.softDelete(id)
  }

  @Patch(':id/restore')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Khôi phục nhân viên' })
  restore(@Param('id', ParseIntPipe) id: number) {
    return this.employeeService.restore(id)
  }
}
