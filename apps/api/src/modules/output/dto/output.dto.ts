import {
  IsInt,
  IsPositive,
  IsEnum,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator'
import { ProductionStage, FactorySection } from '@prisma/client'

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

// Nhập sản lượng tổ cấp xưởng (Cắt / KCS) theo màu × size
export class CreateSectionOutputDto {
  @IsEnum(FactorySection)
  section: FactorySection

  @IsInt()
  styleId: number

  // Bỏ trống khi mã hàng ở chế độ chỉ nhập tổng (không theo màu/size)
  @IsInt()
  @IsOptional()
  colorId?: number

  @IsInt()
  @IsOptional()
  sizeId?: number

  @IsInt()
  @Min(0)
  quantity: number

  @IsOptional()
  @IsDateString()
  outputDate?: string
}

// Nhập sản lượng tổ Hoàn thành theo PO (nhận + đóng thùng)
export class CreateFinishingDto {
  @IsInt()
  poId: number

  @IsInt()
  @Min(0)
  receivedQuantity: number

  @IsInt()
  @Min(0)
  packedQuantity: number

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
