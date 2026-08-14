import { IsInt, IsNumber, IsOptional, IsString, IsDateString, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class ReceiveStockDto {
  @ApiProperty()
  @IsInt()
  sparePartId: number

  @ApiProperty()
  @IsInt()
  factoryId: number

  @ApiProperty({ description: 'Số lượng nhập' })
  @IsNumber()
  @Min(0.0001, { message: 'Số lượng nhập phải lớn hơn 0' })
  quantity: number

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  unitPrice?: number

  @ApiPropertyOptional({ description: 'Yêu cầu mua vật tư tương ứng' })
  @IsInt()
  @IsOptional()
  partRequestId?: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  supplier?: string

  @ApiPropertyOptional({ description: 'Số hóa đơn / phiếu nhập' })
  @IsString()
  @IsOptional()
  documentNo?: string

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  movementDate?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string
}

export class AdjustStockDto {
  @ApiProperty()
  @IsInt()
  sparePartId: number

  @ApiProperty()
  @IsInt()
  factoryId: number

  @ApiProperty({ description: 'Số tồn thực tế đếm được khi kiểm kê' })
  @IsNumber()
  @Min(0)
  quantity: number

  @ApiProperty()
  @IsString()
  reason: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string
}

export class SetMinQuantityDto {
  @ApiProperty()
  @IsInt()
  sparePartId: number

  @ApiProperty()
  @IsInt()
  factoryId: number

  @ApiProperty({ description: 'Tồn tối thiểu để cảnh báo' })
  @IsNumber()
  @Min(0)
  minQuantity: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  location?: string
}
