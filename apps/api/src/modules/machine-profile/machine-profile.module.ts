import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { SettingsModule } from '../settings/settings.module'
import { MachineProfileService } from './machine-profile.service'
import { MachineProfileController } from './machine-profile.controller'

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [MachineProfileController],
  providers: [MachineProfileService],
  exports: [MachineProfileService],
})
export class MachineProfileModule {}
