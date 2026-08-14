import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { StockModule } from '../stock/stock.module'
import { WorkOrderService } from './work-order.service'
import { WorkOrderController } from './work-order.controller'

@Module({
  imports: [PrismaModule, StockModule],
  controllers: [WorkOrderController],
  providers: [WorkOrderService],
  exports: [WorkOrderService],
})
export class WorkOrderModule {}
