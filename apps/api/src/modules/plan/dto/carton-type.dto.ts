import { IsString, IsNumber, Min, IsInt } from 'class-validator'
import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger'

export class CreateCartonTypeDto {
  @ApiProperty()
  @IsInt({ message: 'customerId phải là số nguyên' })
  customerId: number

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
}

// Không cho phép đổi customerId khi cập nhật — thùng đã tạo thuộc cố định 1 khách hàng
export class UpdateCartonTypeDto extends PartialType(OmitType(CreateCartonTypeDto, ['customerId'] as const)) {}
