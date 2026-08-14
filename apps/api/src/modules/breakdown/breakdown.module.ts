import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { BreakdownService } from './breakdown.service'
import { BreakdownController, IncidentController } from './breakdown.controller'

@Module({
  imports: [PrismaModule],
  controllers: [BreakdownController, IncidentController],
  providers: [BreakdownService],
  exports: [BreakdownService],
})
export class BreakdownModule {}
