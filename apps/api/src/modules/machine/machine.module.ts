import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { MachineService } from './machine.service'
import { MachineController } from './machine.controller'
import { MachineMaintenanceService } from './machine-maintenance.service'
import { MachineMaintenanceController } from './machine-maintenance.controller'
import { MachineTransferService } from './machine-transfer.service'
import { MachineTransferController } from './machine-transfer.controller'

@Module({
  imports: [PrismaModule],
  controllers: [MachineController, MachineMaintenanceController, MachineTransferController],
  providers: [MachineService, MachineMaintenanceService, MachineTransferService],
  exports: [MachineService],
})
export class MachineModule {}
