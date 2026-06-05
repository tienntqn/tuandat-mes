import { IsString, IsNotEmpty, IsOptional, IsInt, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'

export class CreateSparePartDto {
  @ApiPropertyOptional({ description: 'Mã phụ tùng — tự sinh nếu bỏ trống' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên phụ tùng không được để trống' })
  @MaxLength(150)
  name: string

  @ApiPropertyOptional({ description: 'Đơn vị: cái, bộ, mét...' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  unit?: string

  @ApiPropertyOptional({ description: 'Chủng loại máy áp dụng' })
  @IsInt()
  @IsOptional()
  categoryId?: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  note?: string
}

export class UpdateSparePartDto extends PartialType(CreateSparePartDto) {}
