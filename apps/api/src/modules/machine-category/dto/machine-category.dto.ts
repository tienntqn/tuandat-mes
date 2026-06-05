import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'

export class CreateMachineCategoryDto {
  @ApiPropertyOptional({ description: 'Mã chủng loại — tự sinh nếu bỏ trống' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên chủng loại không được để trống' })
  @MaxLength(100)
  name: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string
}

export class UpdateMachineCategoryDto extends PartialType(CreateMachineCategoryDto) {}
