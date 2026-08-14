import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'

export class NormItemInput {
  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  sparePartId?: number

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên vật tư không được để trống' })
  name: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  unit?: string

  @ApiProperty()
  @IsNumber()
  @Min(0, { message: 'Số lượng định mức phải lớn hơn hoặc bằng 0' })
  quantity: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string
}

export class CreateMaintenanceNormDto {
  @ApiPropertyOptional({ description: 'Mã định mức — tự sinh nếu bỏ trống' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  code?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên định mức không được để trống' })
  @MaxLength(200)
  name: string

  @ApiPropertyOptional({ description: 'Áp dụng cho chủng loại máy' })
  @IsInt()
  @IsOptional()
  categoryId?: number

  @ApiPropertyOptional({ description: 'Áp dụng riêng cho một máy cụ thể' })
  @IsInt()
  @IsOptional()
  machineId?: number

  @ApiProperty({ description: 'Chu kỳ bảo dưỡng (ngày)' })
  @IsInt()
  @Min(1, { message: 'Chu kỳ bảo dưỡng phải lớn hơn 0 ngày' })
  intervalDays: number

  @ApiPropertyOptional({ description: 'Thời gian thực hiện dự kiến (giờ)' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  estimatedHours?: number

  @ApiPropertyOptional({ description: 'Chi phí dự kiến một lần bảo dưỡng' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  estimatedCost?: number

  @ApiPropertyOptional({ description: 'Các hạng mục kiểm tra, mỗi dòng một mục' })
  @IsString()
  @IsOptional()
  checklist?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean

  @ApiPropertyOptional({ type: [NormItemInput], description: 'Định mức vật tư cho một lần bảo dưỡng' })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => NormItemInput)
  items?: NormItemInput[]
}

export class UpdateMaintenanceNormDto extends PartialType(CreateMaintenanceNormDto) {}
