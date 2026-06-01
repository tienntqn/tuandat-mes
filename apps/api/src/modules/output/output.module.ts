import { Module } from '@nestjs/common'
import { OutputService } from './output.service'
import { OutputController } from './output.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [OutputController],
  providers: [OutputService],
  exports: [OutputService],
})
export class OutputModule {}
