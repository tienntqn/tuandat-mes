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

// ---------- Phiếu yêu cầu bảo dưỡng ----------

export class CreateMaintenanceRequestDto {
  @ApiProperty()
  @IsInt()
  machineId: number

  @ApiProperty({ description: 'Lý do đề nghị bảo dưỡng' })
  @IsString()
  @IsNotEmpty({ message: 'Phải nhập lý do đề nghị bảo dưỡng' })
  reason: string

  @ApiPropertyOptional({ description: 'Ngày mong muốn thực hiện' })
  @IsDateString()
  @IsOptional()
  desiredDate?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string
}

export class UpdateMaintenanceRequestDto extends PartialType(
  OmitType(CreateMaintenanceRequestDto, ['machineId'] as const),
) {}

export class RejectDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
  rejectReason: string
}

// ---------- Kế hoạch sửa chữa / bảo dưỡng ----------

export class WorkPlanItemInput {
  @ApiProperty()
  @IsInt()
  machineId: number

  @ApiPropertyOptional({ description: 'Định mức bảo dưỡng áp dụng' })
  @IsInt()
  @IsOptional()
  normId?: number

  @ApiProperty()
  @IsDateString()
  plannedDate: string

  @ApiProperty({ description: 'Nội dung công việc dự kiến' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung công việc không được để trống' })
  content: string

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  estimatedCost?: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string
}

export class CreateWorkPlanDto {
  @ApiProperty({ enum: WorkType })
  @IsEnum(WorkType, { message: 'Loại kế hoạch không hợp lệ' })
  type: WorkType

  @ApiPropertyOptional({ description: 'Xưởng lập kế hoạch — mặc định là xưởng của người lập' })
  @IsInt()
  @IsOptional()
  factoryId?: number

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên kế hoạch không được để trống' })
  title: string

  @ApiProperty()
  @IsDateString()
  periodFrom: string

  @ApiProperty()
  @IsDateString()
  periodTo: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string

  @ApiPropertyOptional({ type: [WorkPlanItemInput] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WorkPlanItemInput)
  items?: WorkPlanItemInput[]
}

export class UpdateWorkPlanDto extends PartialType(
  OmitType(CreateWorkPlanDto, ['type', 'factoryId'] as const),
) {}
