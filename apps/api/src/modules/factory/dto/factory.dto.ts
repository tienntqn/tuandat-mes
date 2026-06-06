import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
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

  @ApiPropertyOptional({ description: 'Số công nhân tổ Cắt (cấp xưởng)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  cuttingWorkerCount?: number

  @ApiPropertyOptional({ description: 'Số công nhân tổ Hoàn thành (cấp xưởng)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  finishingWorkerCount?: number

  @ApiPropertyOptional({ enum: FactoryStatus })
  @IsEnum(FactoryStatus, { message: 'Trạng thái không hợp lệ' })
  @IsOptional()
  status?: FactoryStatus
}

export class UpdateFactoryDto extends PartialType(CreateFactoryDto) {}
