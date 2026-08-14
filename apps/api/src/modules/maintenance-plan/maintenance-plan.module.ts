import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { SettingsModule } from '../settings/settings.module'
import { MaintenanceRequestService } from './maintenance-request.service'
import { WorkPlanService } from './work-plan.service'
import { MaintenanceRequestController, WorkPlanController } from './maintenance-plan.controller'

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [MaintenanceRequestController, WorkPlanController],
  providers: [MaintenanceRequestService, WorkPlanService],
  exports: [MaintenanceRequestService, WorkPlanService],
})
export class MaintenancePlanModule {}
