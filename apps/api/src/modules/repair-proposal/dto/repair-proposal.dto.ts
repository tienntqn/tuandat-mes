import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { RepairProposalType, AttachmentType } from '@prisma/client'

export class RepairProposalItemInput {
  @IsInt()
  @IsOptional()
  sparePartId?: number

  @IsString()
  @IsNotEmpty({ message: 'Tên hạng mục không được để trống' })
  @MaxLength(150)
  name: string

  @IsInt()
  @Min(1)
  quantity: number

  @IsString()
  @IsOptional()
  @MaxLength(30)
  unit?: string

  @IsString()
  @IsOptional()
  @MaxLength(255)
  note?: string
}

export class RepairProposalAttachmentInput {
  @IsEnum(AttachmentType)
  type: AttachmentType

  @IsString()
  url: string

  @IsString()
  @IsOptional()
  filename?: string
}

export class CreateRepairProposalDto {
  @ApiProperty()
  @IsInt()
  machineId: number

  @ApiProperty({ enum: RepairProposalType })
  @IsEnum(RepairProposalType)
  type: RepairProposalType

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MaxLength(200)
  title: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  estimatedCost?: number

  @ApiPropertyOptional({ type: [RepairProposalItemInput] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RepairProposalItemInput)
  items?: RepairProposalItemInput[]

  @ApiPropertyOptional({ type: [RepairProposalAttachmentInput] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RepairProposalAttachmentInput)
  attachments?: RepairProposalAttachmentInput[]
}

export class UpdateRepairProposalDto extends PartialType(CreateRepairProposalDto) {}

export class RejectRepairProposalDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
  rejectReason: string
}
