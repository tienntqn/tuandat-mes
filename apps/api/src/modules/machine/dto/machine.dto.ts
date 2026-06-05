import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { MachineType, MachineStatus } from '@prisma/client'

export class MachineImageInput {
  @IsString()
  url: string

  @IsString()
  @IsOptional()
  caption?: string
}

export class CreateMachineDto {
  @ApiPropertyOptional({ description: 'Mã máy — tự sinh nếu bỏ trống' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  code?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên máy không được để trống' })
  @MaxLength(100)
  name: string

  @ApiProperty({ enum: MachineType })
  @IsEnum(MachineType, { message: 'Loại máy không hợp lệ' })
  type: MachineType

  @ApiProperty()
  @IsInt({ message: 'factoryId phải là số nguyên' })
  factoryId: number

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  lineId?: number

  @ApiPropertyOptional({ enum: MachineStatus })
  @IsEnum(MachineStatus, { message: 'Trạng thái không hợp lệ' })
  @IsOptional()
  status?: MachineStatus

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  brand?: string

  @ApiPropertyOptional({ description: 'ID hãng sản xuất (danh mục)' })
  @IsInt()
  @IsOptional()
  brandId?: number

  @ApiPropertyOptional({ description: 'ID chủng loại máy (danh mục)' })
  @IsInt()
  @IsOptional()
  categoryId?: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  model?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  serialNo?: string

  @ApiPropertyOptional({ description: 'Năm sản xuất' })
  @IsInt()
  @IsOptional()
  @Min(1900)
  manufactureYear?: number

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  purchaseDate?: string

  @ApiPropertyOptional({ description: 'Hạn bảo hành' })
  @IsDateString()
  @IsOptional()
  warrantyExpiry?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string

  @ApiPropertyOptional({ type: [MachineImageInput] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MachineImageInput)
  images?: MachineImageInput[]
}

export class UpdateMachineDto extends PartialType(CreateMachineDto) {}

// Thanh lý máy
export class LiquidateMachineDto {
  @ApiProperty()
  @IsDateString()
  liquidationDate: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Lý do thanh lý không được để trống' })
  reason: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  decisionNo?: string

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  salvageValue?: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  approvedBy?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string
}

export class AssignLineDto {
  @ApiPropertyOptional({ description: 'null để gỡ khỏi chuyền' })
  @IsInt()
  @IsOptional()
  lineId?: number | null
}
