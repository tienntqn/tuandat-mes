import { IsString, IsOptional, IsInt, IsEnum, IsDateString, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { DeliveryStatus } from '@prisma/client'

export class CreateDeliveryPlanDto {
  @ApiProperty()
  @IsInt({ message: 'poId phải là số nguyên' })
  @Type(() => Number)
  poId: number

  @ApiProperty()
  @IsDateString({}, { message: 'Ngày giao dự kiến không hợp lệ' })
  plannedDate: string

  @ApiProperty()
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  @Type(() => Number)
  plannedQuantity: number

  @ApiPropertyOptional()
  @IsDateString({}, { message: 'Ngày giao thực tế không hợp lệ' })
  @IsOptional()
  actualDate?: string

  @ApiPropertyOptional()
  @IsInt({ message: 'Số lượng thực giao phải là số nguyên' })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  actualQuantity?: number

  @ApiPropertyOptional({ enum: DeliveryStatus })
  @IsEnum(DeliveryStatus, { message: 'Trạng thái không hợp lệ' })
  @IsOptional()
  status?: DeliveryStatus

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string
}

export class UpdateDeliveryPlanDto extends PartialType(CreateDeliveryPlanDto) {}
