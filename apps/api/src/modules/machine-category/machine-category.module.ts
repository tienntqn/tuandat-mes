import { Module } from '@nestjs/common'
import { MachineCategoryController } from './machine-category.controller'
import { MachineCategoryService } from './machine-category.service'

@Module({
  controllers: [MachineCategoryController],
  providers: [MachineCategoryService],
  exports: [MachineCategoryService],
})
export class MachineCategoryModule {}
