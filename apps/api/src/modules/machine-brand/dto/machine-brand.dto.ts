import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'

export class CreateMachineBrandDto {
  @ApiPropertyOptional({ description: 'Mã hãng — tự sinh nếu bỏ trống' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên hãng không được để trống' })
  @MaxLength(100)
  name: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  country?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  note?: string
}

export class UpdateMachineBrandDto extends PartialType(CreateMachineBrandDto) {}
