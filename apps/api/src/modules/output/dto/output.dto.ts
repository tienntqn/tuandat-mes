import {
  IsInt,
  IsPositive,
  IsEnum,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator'
import { ProductionStage } from '@prisma/client'

export class CreateDailyOutputDto {
  @IsInt()
  styleId: number

  @IsInt()
  @IsOptional()
  colorId?: number

  @IsInt()
  @IsOptional()
  sizeId?: number

  @IsEnum(ProductionStage)
  stage: ProductionStage

  @IsInt()
  @Min(0)
  quantity: number

  // Nếu không truyền → dùng ngày hôm nay (server time)
  @IsOptional()
  @IsDateString()
  outputDate?: string
}

export class QueryOutputDto {
  @IsOptional()
  @IsInt()
  lineId?: number

  @IsOptional()
  @IsDateString()
  date?: string

  @IsOptional()
  @IsInt()
  @IsPositive()
  days?: number // lấy N ngày gần nhất (cho history)
}
