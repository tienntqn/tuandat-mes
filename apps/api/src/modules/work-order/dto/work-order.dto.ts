import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsBoolean,
  IsArray,
  IsDateString,
  ValidateNested,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger'
import { WorkType } from '@prisma/client'

export class WorkOrderPartInput {
  @ApiPropertyOptional({ description: 'Phụ tùng trong danh mục — có thì mới trừ được kho' })
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
  @Min(0.0001, { message: 'Số lượng vật tư phải lớn hơn 0' })
  quantity: number

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  @Min(0)
  unitPrice?: number

  @ApiPropertyOptional({ description: 'true: xuất từ kho xưởng, false: mua ngoài' })
  @IsBoolean()
  @IsOptional()
  fromStock?: boolean

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string
}

export class CreateWorkOrderDto {
  @ApiProperty({ enum: WorkType, description: 'REPAIR: phiếu sửa chữa · MAINTENANCE: phiếu bảo dưỡng' })
  @IsEnum(WorkType, { message: 'Loại phiếu không hợp lệ' })
  type: WorkType

  @ApiProperty()
  @IsInt()
  machineId: number

  @ApiPropertyOptional({ description: 'Phát sinh từ phiếu báo hỏng' })
  @IsInt()
  @IsOptional()
  breakdownReportId?: number

  @ApiPropertyOptional({ description: 'Phát sinh từ phiếu yêu cầu bảo dưỡng' })
  @IsInt()
  @IsOptional()
  maintenanceRequestId?: number

  @ApiPropertyOptional({ description: 'Phát sinh từ một dòng kế hoạch' })
  @IsInt()
  @IsOptional()
  planItemId?: number

  @ApiProperty({ description: 'Nội dung công việc' })
  @IsString()
  @IsNotEmpty({ message: 'Nội dung công việc không được để trống' })
  content: string

  @ApiPropertyOptional({ description: 'Cơ điện phụ trách — mặc định là người lập phiếu' })
  @IsInt()
  @IsOptional()
  performedBy?: number

  @ApiPropertyOptional({ description: 'Người phối hợp' })
  @IsString()
  @IsOptional()
  assistants?: string

  @ApiPropertyOptional({ description: 'Tình trạng phát hiện khi kiểm tra' })
  @IsString()
  @IsOptional()
  findings?: string

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startedAt?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string

  @ApiPropertyOptional({ type: [WorkOrderPartInput] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderPartInput)
  parts?: WorkOrderPartInput[]
}

export class UpdateWorkOrderDto extends PartialType(
  OmitType(CreateWorkOrderDto, ['machineId', 'type'] as const),
) {}

export class CompleteWorkOrderDto {
  @ApiProperty({ description: 'Kết quả thực hiện' })
  @IsString()
  @IsNotEmpty({ message: 'Phải ghi kết quả thực hiện' })
  result: string

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  finishedAt?: string

  @ApiPropertyOptional({ description: 'Số giờ máy dừng' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  downtimeHours?: number

  @ApiPropertyOptional({ description: 'Chi phí nhân công' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  laborCost?: number

  @ApiPropertyOptional({ description: 'Hạn bảo dưỡng kế tiếp' })
  @IsDateString()
  @IsOptional()
  nextDueDate?: string

  @ApiPropertyOptional({ description: 'Chốt lại danh sách vật tư đã dùng trước khi trừ kho' })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderPartInput)
  parts?: WorkOrderPartInput[]

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  note?: string
}
