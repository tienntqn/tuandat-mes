import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { MaintenanceNormService } from './maintenance-norm.service'
import { MaintenanceNormController } from './maintenance-norm.controller'

@Module({
  imports: [PrismaModule],
  controllers: [MaintenanceNormController],
  providers: [MaintenanceNormService],
  exports: [MaintenanceNormService],
})
export class MaintenanceNormModule {}
