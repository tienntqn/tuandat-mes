import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'

export class CreateColorDto {
  @ApiPropertyOptional({ description: 'Mã màu — tự sinh nếu bỏ trống' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên màu không được để trống' })
  @MaxLength(100)
  name: string

  @ApiPropertyOptional({ description: 'Mã màu hiển thị, vd #FFFFFF' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  hex?: string
}

export class UpdateColorDto extends PartialType(CreateColorDto) {}
