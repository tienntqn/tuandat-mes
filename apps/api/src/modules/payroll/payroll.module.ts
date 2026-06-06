import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { SettingsModule } from '../settings/settings.module'
import { PayrollService } from './payroll.service'
import { PayrollController } from './payroll.controller'

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [PayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
