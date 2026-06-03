import { Module } from '@nestjs/common'
import { DeliveryPlanController } from './delivery-plan.controller'
import { DeliveryPlanService } from './delivery-plan.service'

@Module({
  controllers: [DeliveryPlanController],
  providers: [DeliveryPlanService],
  exports: [DeliveryPlanService],
})
export class DeliveryPlanModule {}
