import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsDateString, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { MachineType, MachineStatus } from '@prisma/client'

export class CreateMachineDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Mã máy không được để trống' })
  @MaxLength(30)
  code: string

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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  model?: string

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  purchaseDate?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string
}

export class UpdateMachineDto extends PartialType(CreateMachineDto) {}

export class AssignLineDto {
  @ApiPropertyOptional({ description: 'null để gỡ khỏi chuyền' })
  @IsInt()
  @IsOptional()
  lineId?: number | null
}
