import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { MachineRecordService } from './machine-record.service'
import { MachineCertificateController, MachineDocumentController } from './machine-record.controller'

@Module({
  imports: [PrismaModule],
  controllers: [MachineCertificateController, MachineDocumentController],
  providers: [MachineRecordService],
  exports: [MachineRecordService],
})
export class MachineRecordModule {}
