import { IsString, IsOptional, IsNumber, Min, IsArray, ValidateNested, IsInt, IsObject } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CartonInputDto {
  @ApiProperty()
  @IsString()
  id: string

  @ApiProperty()
  @IsString()
  label: string

  @ApiProperty()
  @IsNumber()
  @Min(0.001, { message: 'Kích thước thùng phải lớn hơn 0' })
  length: number

  @ApiProperty()
  @IsNumber()
  @Min(0.001, { message: 'Kích thước thùng phải lớn hơn 0' })
  width: number

  @ApiProperty()
  @IsNumber()
  @Min(0.001, { message: 'Kích thước thùng phải lớn hơn 0' })
  height: number

  @ApiProperty()
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  quantity: number

  @ApiProperty()
  @IsString()
  color: string
}

export class CreateContainerLoadingPlanDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string

  @ApiProperty()
  @IsString()
  containerTypeCode: string

  @ApiProperty()
  @IsNumber()
  @Min(0.001)
  containerLength: number

  @ApiProperty()
  @IsNumber()
  @Min(0.001)
  containerWidth: number

  @ApiProperty()
  @IsNumber()
  @Min(0.001)
  containerHeight: number

  @ApiProperty({ type: [CartonInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartonInputDto)
  cartons: CartonInputDto[]

  @ApiProperty({ description: 'Kết quả xếp container đã tính ở frontend (PackingSummary), lưu nguyên dạng để xem lại 3D không cần tính lại' })
  @IsObject()
  result: Record<string, any>

  @ApiProperty()
  @IsInt()
  @Min(1)
  containersUsed: number

  @ApiProperty()
  @IsNumber()
  @Min(0)
  overallUtilization: number
}
