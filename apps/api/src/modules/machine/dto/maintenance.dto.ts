import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsDateString, IsNumber } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { MaintenanceType } from '@prisma/client'

export class CreateMaintenanceDto {
  @ApiProperty()
  @IsInt()
  machineId: number

  @ApiProperty()
  @IsDateString()
  maintenanceDate: string

  @ApiProperty({ enum: MaintenanceType })
  @IsEnum(MaintenanceType, { message: 'Loại bảo dưỡng không hợp lệ' })
  type: MaintenanceType

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Mô tả không được để trống' })
  description: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  performedBy?: string

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  cost?: number

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  nextDueDate?: string
}
