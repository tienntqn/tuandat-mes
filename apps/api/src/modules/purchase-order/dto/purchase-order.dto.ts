import { IsString, IsNotEmpty, IsOptional, IsInt, IsEnum, IsDateString, IsArray, ValidateNested, IsNumber, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { POStatus } from '@prisma/client'

export class PoItemInput {
  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  colorId: number

  @ApiProperty()
  @IsInt()
  @Type(() => Number)
  sizeId: number

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  quantity: number
}

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

  @ApiPropertyOptional({ description: 'Đơn giá gia công / sản phẩm' })
  @IsNumber({}, { message: 'Đơn giá không hợp lệ' })
  @Min(0, { message: 'Đơn giá không được âm' })
  @IsOptional()
  @Type(() => Number)
  unitPrice?: number

  @ApiPropertyOptional({ description: 'Giá trợ giá do BOD duyệt (thay thế đơn giá khi tính lương)' })
  @IsNumber({}, { message: 'Trợ giá không hợp lệ' })
  @Min(0, { message: 'Trợ giá không được âm' })
  @IsOptional()
  @Type(() => Number)
  subsidyPrice?: number

  @ApiPropertyOptional({ enum: POStatus })
  @IsEnum(POStatus, { message: 'Trạng thái không hợp lệ' })
  @IsOptional()
  status?: POStatus

  @ApiPropertyOptional({ description: 'Phân bổ ma trận màu × size', type: [PoItemInput] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PoItemInput)
  @IsOptional()
  items?: PoItemInput[]
}

export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {}
