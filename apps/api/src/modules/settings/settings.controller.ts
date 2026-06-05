import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { SettingsService } from './settings.service'
import { UpdateSettingsDto } from './dto/settings.dto'

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Mọi user đã đăng nhập đều đọc được cấu hình (để ẩn/hiện màn KCS...)
  @Get()
  get() {
    return this.settingsService.get()
  }

  // Chỉ ADMIN được thay đổi cấu hình
  @Patch()
  @Roles('ADMIN')
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(dto)
  }
}
