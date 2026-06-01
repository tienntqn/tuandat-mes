import { Controller, Post, Body, HttpCode } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { IsString, MinLength } from 'class-validator'
import { AuthService } from './auth.service'

class LoginDto {
  @IsString() username: string
  @IsString() @MinLength(1) password: string
}

class RefreshDto {
  @IsString() refreshToken: string
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password)
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshToken(dto.refreshToken)
  }
}
