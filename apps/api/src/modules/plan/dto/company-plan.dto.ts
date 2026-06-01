import { IsInt, IsNotEmpty, IsDateString, IsOptional, IsArray, ValidateNested, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CreateCompanyPlanDto {
  @ApiProperty()
  @IsInt({ message: 'styleId phải là số nguyên' })
  styleId: number

  @ApiProperty()
  @IsInt({ message: 'poId phải là số nguyên' })
  poId: number

  @ApiProperty()
  @IsInt({ message: 'factoryId phải là số nguyên' })
  factoryId: number

  @ApiProperty()
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  plannedQuantity: number

  @ApiProperty()
  @IsDateString({}, { message: 'startDate không hợp lệ' })
  startDate: string

  @ApiProperty()
  @IsDateString({}, { message: 'expectedFinishDate không hợp lệ' })
  expectedFinishDate: string
}

export class UpdateCompanyPlanDto extends PartialType(CreateCompanyPlanDto) {}

// Tạo nhiều dòng kế hoạch cùng lúc (phân bổ 1 PO cho nhiều xưởng)
export class BulkCreateCompanyPlanDto {
  @ApiProperty({ type: [CreateCompanyPlanDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCompanyPlanDto)
  plans: CreateCompanyPlanDto[]
}
