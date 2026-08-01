import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { CompanyPlanService } from './company-plan.service'
import { CompanyPlanController } from './company-plan.controller'
import { FactoryPlanService } from './factory-plan.service'
import { FactoryPlanController } from './factory-plan.controller'
import { SohoConverterService } from './soho-converter.service'
import { SohoConverterController } from './soho-converter.controller'

@Module({
  imports: [PrismaModule],
  controllers: [CompanyPlanController, FactoryPlanController, SohoConverterController],
  providers: [CompanyPlanService, FactoryPlanService, SohoConverterService],
  exports: [CompanyPlanService, FactoryPlanService, SohoConverterService],
})
export class PlanModule {}
