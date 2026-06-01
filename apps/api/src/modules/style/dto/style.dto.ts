import { IsString, IsNotEmpty, IsOptional, IsInt, IsNumber, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CreateStyleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Mã hàng không được để trống' })
  code: string

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
}

export class UpdateStyleDto extends PartialType(CreateStyleDto) {}
