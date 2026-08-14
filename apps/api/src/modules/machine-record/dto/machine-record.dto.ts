import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsDateString,
  MaxLength,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { CertificateType, MachineDocumentType } from '@prisma/client'

// ---------- Chứng chỉ / kiểm định ----------

export class CreateCertificateDto {
  @ApiProperty()
  @IsInt()
  machineId: number

  @ApiPropertyOptional({ enum: CertificateType })
  @IsEnum(CertificateType, { message: 'Loại chứng chỉ không hợp lệ' })
  @IsOptional()
  type?: CertificateType

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(50)
  certNo?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên chứng chỉ không được để trống' })
  @MaxLength(200)
  name: string

  @ApiPropertyOptional({ description: 'Đơn vị cấp' })
  @IsString()
  @IsOptional()
  issuedBy?: string

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  issueDate?: string

  @ApiPropertyOptional({ description: 'Ngày hết hạn — dùng để cảnh báo' })
  @IsDateString()
  @IsOptional()
  expiryDate?: string

  @ApiPropertyOptional({ description: 'URL file chứng chỉ đã tải lên' })
  @IsString()
  @IsOptional()
  fileUrl?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string
}

export class UpdateCertificateDto extends PartialType(CreateCertificateDto) {}

// ---------- Tài liệu hồ sơ máy ----------

export class CreateMachineDocumentDto {
  @ApiProperty()
  @IsInt()
  machineId: number

  @ApiPropertyOptional({ enum: MachineDocumentType })
  @IsEnum(MachineDocumentType, { message: 'Loại tài liệu không hợp lệ' })
  @IsOptional()
  type?: MachineDocumentType

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên tài liệu không được để trống' })
  @MaxLength(200)
  name: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Thiếu file tài liệu' })
  url: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  filename?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string
}

export class UpdateMachineDocumentDto extends PartialType(CreateMachineDocumentDto) {}
