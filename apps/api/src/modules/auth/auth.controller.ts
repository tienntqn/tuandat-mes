import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  UseGuards,
  HttpStatus,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { LoginDto, RefreshTokenDto } from './dto/login.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Public } from '../../common/decorators/public.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 lần/phút
  @ApiOperation({ summary: 'Đăng nhập' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password)
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin người dùng hiện tại' })
  getMe(@CurrentUser() user: RequestUser) {
    return this.authService.getMe(user.id)
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đổi mật khẩu' })
  changePassword(@CurrentUser() user: RequestUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto.oldPassword, dto.newPassword)
  }
}
