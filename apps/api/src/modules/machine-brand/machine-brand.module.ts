import { Module } from '@nestjs/common'
import { MachineBrandController } from './machine-brand.controller'
import { MachineBrandService } from './machine-brand.service'

@Module({
  controllers: [MachineBrandController],
  providers: [MachineBrandService],
  exports: [MachineBrandService],
})
export class MachineBrandModule {}
