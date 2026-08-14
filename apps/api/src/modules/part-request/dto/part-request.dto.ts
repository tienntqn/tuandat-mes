import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsArray,
  IsDateString,
  ValidateNested,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger'
import { WorkType } from '@prisma/client'

export class PartRequestItemInput {
  @ApiPropertyOptional({ description: 'Phụ tùng trong danh mục' })
  @IsInt()
  @IsOptional()
  sparePartId?: number

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên vật tư không được để trống' })
  name: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  unit?: string

  @ApiProperty()
  @IsNumber()
  @Min(0.0001, { message: 'Số lượng phải lớn hơn 0' })
  quantity: number

  @ApiPropertyOptional({ description: 'Đơn giá dự kiến' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  estimatedPrice?: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string
}

export class CreatePartRequestDto {
  @ApiProperty({ enum: WorkType, description: 'Vật tư cho sửa chữa hay bảo dưỡng' })
  @IsEnum(WorkType, { message: 'Loại yêu cầu không hợp lệ' })
  type: WorkType

  @ApiPropertyOptional({ description: 'Xưởng yêu cầu — mặc định là xưởng của người lập' })
  @IsInt()
  @IsOptional()
  factoryId?: number

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string

  @ApiPropertyOptional({ description: 'Kế hoạch phát sinh nhu cầu' })
  @IsInt()
  @IsOptional()
  workPlanId?: number

  @ApiPropertyOptional({ description: 'Phiếu sửa chữa/bảo dưỡng phát sinh nhu cầu' })
  @IsInt()
  @IsOptional()
  workOrderId?: number

  @ApiPropertyOptional({ description: 'Phiếu báo hỏng phát sinh nhu cầu' })
  @IsInt()
  @IsOptional()
  breakdownReportId?: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string

  @ApiProperty()
  @IsDateString()
  requestDate: string

  @ApiPropertyOptional({ description: 'Ngày cần có vật tư' })
  @IsDateString()
  @IsOptional()
  neededDate?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string

  @ApiProperty({ type: [PartRequestItemInput] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PartRequestItemInput)
  items: PartRequestItemInput[]
}

export class UpdatePartRequestDto extends PartialType(
  OmitType(CreatePartRequestDto, ['type', 'factoryId'] as const),
) {}

export class RejectPartRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
  rejectReason: string
}

export class ReceiveItemInput {
  @ApiProperty({ description: 'Dòng vật tư trong yêu cầu' })
  @IsInt()
  itemId: number

  @ApiProperty({ description: 'Số lượng thực nhận lần này' })
  @IsNumber()
  @Min(0.0001, { message: 'Số lượng nhận phải lớn hơn 0' })
  quantity: number

  @ApiPropertyOptional({ description: 'Đơn giá thực tế' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  unitPrice?: number
}

export class ReceivePartRequestDto {
  @ApiProperty({ type: [ReceiveItemInput] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveItemInput)
  items: ReceiveItemInput[]

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
