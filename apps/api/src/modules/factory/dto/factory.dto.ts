import { IsString, IsNotEmpty, IsOptional, IsEnum, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { FactoryStatus } from '@prisma/client'

export class CreateFactoryDto {
  @ApiPropertyOptional({ description: 'Mã xưởng — tự sinh nếu bỏ trống' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên xưởng không được để trống' })
  @MaxLength(100)
  name: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string

  @ApiPropertyOptional({ enum: FactoryStatus })
  @IsEnum(FactoryStatus, { message: 'Trạng thái không hợp lệ' })
  @IsOptional()
  status?: FactoryStatus
}

export class UpdateFactoryDto extends PartialType(CreateFactoryDto) {}
