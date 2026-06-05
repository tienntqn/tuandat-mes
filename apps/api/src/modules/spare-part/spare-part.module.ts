import { Module } from '@nestjs/common'
import { SparePartController } from './spare-part.controller'
import { SparePartService } from './spare-part.service'

@Module({
  controllers: [SparePartController],
  providers: [SparePartService],
  exports: [SparePartService],
})
export class SparePartModule {}
