import { IsString, IsNotEmpty, IsOptional, IsInt, IsEnum, IsDateString, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { POStatus } from '@prisma/client'

export class CreatePurchaseOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Số PO không được để trống' })
  poNumber: string

  @ApiProperty()
  @IsInt({ message: 'styleId phải là số nguyên' })
  @Type(() => Number)
  styleId: number

  @ApiPropertyOptional({ description: 'Gắn PO vào đơn đặt hàng (Order)' })
  @IsInt({ message: 'orderId phải là số nguyên' })
  @IsOptional()
  @Type(() => Number)
  orderId?: number

  @ApiProperty()
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  @Type(() => Number)
  totalQuantity: number

  @ApiProperty()
  @IsDateString({}, { message: 'Ngày giao hàng không hợp lệ' })
  deliveryDate: string

  @ApiPropertyOptional({ enum: POStatus })
  @IsEnum(POStatus, { message: 'Trạng thái không hợp lệ' })
  @IsOptional()
  status?: POStatus
}

export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {}
