import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { StockModule } from '../stock/stock.module'
import { SettingsModule } from '../settings/settings.module'
import { PartRequestService } from './part-request.service'
import { PartRequestController } from './part-request.controller'

@Module({
  imports: [PrismaModule, StockModule, SettingsModule],
  controllers: [PartRequestController],
  providers: [PartRequestService],
  exports: [PartRequestService],
})
export class PartRequestModule {}
