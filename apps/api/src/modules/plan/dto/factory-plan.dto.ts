import { IsInt, IsDateString, IsArray, ValidateNested, IsNumber, IsOptional, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CreateFactoryPlanDto {
  @ApiProperty()
  @IsInt({ message: 'companyPlanId phải là số nguyên' })
  companyPlanId: number

  @ApiProperty()
  @IsInt({ message: 'lineId phải là số nguyên' })
  lineId: number

  @ApiProperty()
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  plannedQuantity: number

  @ApiProperty()
  @IsDateString({}, { message: 'expectedFinishDate không hợp lệ' })
  expectedFinishDate: string

  @ApiPropertyOptional({ description: 'Đơn giá gia công riêng của chuyền (để trống = theo PO)' })
  @IsNumber({}, { message: 'Đơn giá không hợp lệ' })
  @Min(0, { message: 'Đơn giá không được âm' })
  @IsOptional()
  @Type(() => Number)
  unitPrice?: number
}

export class UpdateFactoryPlanDto extends PartialType(CreateFactoryPlanDto) {}

// Phân bổ nhiều chuyền cho 1 CompanyPlan cùng lúc
export class BulkCreateFactoryPlanDto {
  @ApiProperty({ type: [CreateFactoryPlanDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFactoryPlanDto)
  plans: CreateFactoryPlanDto[]
}
