import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { MachineHandoverService } from './machine-handover.service'
import { MachineHandoverController } from './machine-handover.controller'

@Module({
  imports: [PrismaModule],
  controllers: [MachineHandoverController],
  providers: [MachineHandoverService],
  exports: [MachineHandoverService],
})
export class MachineHandoverModule {}
