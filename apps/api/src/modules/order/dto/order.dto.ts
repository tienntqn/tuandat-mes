import { IsString, IsNotEmpty, IsOptional, IsInt, IsEnum, IsDateString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { OrderStatus } from '@prisma/client'

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'Số đơn hàng — tự sinh nếu bỏ trống' })
  @IsString()
  @IsOptional()
  orderNumber?: string

  @ApiProperty()
  @IsInt({ message: 'customerId phải là số nguyên' })
  @Type(() => Number)
  customerId: number

  @ApiProperty()
  @IsDateString({}, { message: 'Ngày đặt hàng không hợp lệ' })
  orderDate: string

  @ApiPropertyOptional()
  @IsDateString({}, { message: 'Ngày giao hàng không hợp lệ' })
  @IsOptional()
  deliveryDate?: string

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsEnum(OrderStatus, { message: 'Trạng thái không hợp lệ' })
  @IsOptional()
  status?: OrderStatus

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string
}

export class UpdateOrderDto extends PartialType(CreateOrderDto) {}
