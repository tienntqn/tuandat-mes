import { IsString, IsNotEmpty, IsOptional, IsInt, IsNumber, IsArray, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CreateStyleDto {
  @ApiPropertyOptional({ description: 'Mã hàng — tự sinh nếu bỏ trống' })
  @IsString()
  @IsOptional()
  code?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên mã hàng không được để trống' })
  name: string

  @ApiProperty()
  @IsInt({ message: 'customerId phải là số nguyên' })
  @Type(() => Number)
  customerId: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  season?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  image?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional()
  @IsNumber({}, { message: 'SAM phải là số' })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  sam?: number

  @ApiPropertyOptional({ description: 'Danh sách id màu của mã hàng', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  colorIds?: number[]

  @ApiPropertyOptional({ description: 'Danh sách id size của mã hàng', type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  sizeIds?: number[]
}

export class UpdateStyleDto extends PartialType(CreateStyleDto) {}
