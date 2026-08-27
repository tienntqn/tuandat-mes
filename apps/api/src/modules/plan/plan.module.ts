import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { CompanyPlanService } from './company-plan.service'
import { CompanyPlanController } from './company-plan.controller'
import { FactoryPlanService } from './factory-plan.service'
import { FactoryPlanController } from './factory-plan.controller'
import { SohoConverterService } from './soho-converter.service'
import { SohoConverterController } from './soho-converter.controller'
import { ContainerLoadingService } from './container-loading.service'
import { ContainerLoadingController } from './container-loading.controller'
import { CartonTypeService } from './carton-type.service'
import { CartonTypeController } from './carton-type.controller'

@Module({
  imports: [PrismaModule],
  controllers: [CompanyPlanController, FactoryPlanController, SohoConverterController, ContainerLoadingController, CartonTypeController],
  providers: [CompanyPlanService, FactoryPlanService, SohoConverterService, ContainerLoadingService, CartonTypeService],
  exports: [CompanyPlanService, FactoryPlanService, SohoConverterService, ContainerLoadingService, CartonTypeService],
})
export class PlanModule {}
