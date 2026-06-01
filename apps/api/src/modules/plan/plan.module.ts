import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { CompanyPlanService } from './company-plan.service'
import { CompanyPlanController } from './company-plan.controller'
import { FactoryPlanService } from './factory-plan.service'
import { FactoryPlanController } from './factory-plan.controller'

@Module({
  imports: [PrismaModule],
  controllers: [CompanyPlanController, FactoryPlanController],
  providers: [CompanyPlanService, FactoryPlanService],
  exports: [CompanyPlanService, FactoryPlanService],
})
export class PlanModule {}
