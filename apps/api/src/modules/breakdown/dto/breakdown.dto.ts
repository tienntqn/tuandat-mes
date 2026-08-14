import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsNumber,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger'
import { BreakdownSeverity } from '@prisma/client'

// ---------- Phiếu báo hỏng ----------

export class CreateBreakdownDto {
  @ApiProperty()
  @IsInt()
  machineId: number

  @ApiPropertyOptional({ description: 'Chuyền đang đặt máy khi hỏng' })
  @IsInt()
  @IsOptional()
  lineId?: number

  @ApiPropertyOptional({ enum: BreakdownSeverity })
  @IsEnum(BreakdownSeverity, { message: 'Mức độ nghiêm trọng không hợp lệ' })
  @IsOptional()
  severity?: BreakdownSeverity

  @ApiProperty({ description: 'Hiện tượng hỏng' })
  @IsString()
  @IsNotEmpty({ message: 'Phải mô tả hiện tượng hỏng' })
  symptom: string

  @ApiPropertyOptional({ description: 'Máy hỏng có làm dừng sản xuất không' })
  @IsBoolean()
  @IsOptional()
  stoppedProduction?: boolean

  @ApiPropertyOptional({ type: [String], description: 'URL ảnh hiện trạng' })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  imageUrls?: string[]

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string
}

export class UpdateBreakdownDto extends PartialType(OmitType(CreateBreakdownDto, ['machineId'] as const)) {}

// ---------- Biên bản sự cố ----------

export class CreateIncidentDto {
  @ApiProperty()
  @IsInt()
  machineId: number

  @ApiPropertyOptional({ description: 'Phiếu báo hỏng liên quan' })
  @IsInt()
  @IsOptional()
  breakdownReportId?: number

  @ApiProperty()
  @IsDateString()
  incidentDate: string

  @ApiProperty({ description: 'Diễn biến sự cố' })
  @IsString()
  @IsNotEmpty({ message: 'Phải mô tả diễn biến sự cố' })
  description: string

  @ApiPropertyOptional({ description: 'Nguyên nhân' })
  @IsString()
  @IsOptional()
  cause?: string

  @ApiPropertyOptional({ description: 'Hậu quả' })
  @IsString()
  @IsOptional()
  consequence?: string

  @ApiPropertyOptional({ description: 'Số giờ dừng máy' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  downtimeHours?: number

  @ApiPropertyOptional({ description: 'Giá trị thiệt hại ước tính' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  damageValue?: number

  @ApiPropertyOptional({ description: 'Bên chịu trách nhiệm' })
  @IsString()
  @IsOptional()
  responsibleParty?: string

  @ApiPropertyOptional({ description: 'Biện pháp khắc phục, phòng ngừa' })
  @IsString()
  @IsOptional()
  preventiveAction?: string

  @ApiPropertyOptional({ description: 'Thành phần tham gia lập biên bản' })
  @IsString()
  @IsOptional()
  witnesses?: string

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  imageUrls?: string[]
}

export class UpdateIncidentDto extends PartialType(OmitType(CreateIncidentDto, ['machineId'] as const)) {}
