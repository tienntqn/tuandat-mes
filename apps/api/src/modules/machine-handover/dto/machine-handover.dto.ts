import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsDateString,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger'
import { HandoverType } from '@prisma/client'

export class CreateHandoverDto {
  @ApiProperty({ enum: HandoverType, description: 'Loại biên bản: nhận máy / sau sửa chữa / sau bảo dưỡng' })
  @IsEnum(HandoverType, { message: 'Loại biên bản bàn giao không hợp lệ' })
  type: HandoverType

  @ApiProperty()
  @IsInt()
  machineId: number

  @ApiPropertyOptional({ description: 'Chuyền tiếp nhận máy (nếu có)' })
  @IsInt()
  @IsOptional()
  lineId?: number

  @ApiPropertyOptional({ description: 'Phiếu sửa chữa/bảo dưỡng tương ứng' })
  @IsInt()
  @IsOptional()
  workOrderId?: number

  @ApiProperty()
  @IsDateString()
  handoverDate: string

  @ApiPropertyOptional({ description: 'Bên giao ngoài hệ thống (nhà cung cấp, đơn vị vận chuyển...)' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  fromParty?: string

  @ApiPropertyOptional({ description: 'Nhân viên bên giao' })
  @IsInt()
  @IsOptional()
  senderId?: number

  @ApiPropertyOptional({ description: 'Nhân viên bên nhận' })
  @IsInt()
  @IsOptional()
  receiverId?: number

  @ApiPropertyOptional({ description: 'Tình trạng máy khi bàn giao' })
  @IsString()
  @IsOptional()
  condition?: string

  @ApiPropertyOptional({ description: 'Phụ kiện, đồ nghề kèm theo' })
  @IsString()
  @IsOptional()
  accessories?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string
}

// Không cho đổi máy và loại biên bản sau khi đã tạo
export class UpdateHandoverDto extends PartialType(
  OmitType(CreateHandoverDto, ['machineId', 'type'] as const),
) {}

export class RejectHandoverDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
  rejectReason: string
}
