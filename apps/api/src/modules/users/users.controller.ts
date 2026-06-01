import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from './dto/create-user.dto'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Danh sách người dùng (ADMIN)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.usersService.findAll(page, pageSize)
  }

  @Get('roles')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Danh sách roles' })
  getRoles() {
    return this.usersService.getRoles()
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Chi tiết người dùng' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id)
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Tạo tài khoản mới (ADMIN)' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto)
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cập nhật user (isActive, roles)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto)
  }

  @Patch(':id/reset-password')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Đặt lại mật khẩu (ADMIN)' })
  resetPassword(@Param('id', ParseIntPipe) id: number, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, dto)
  }
}
