import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsEmail,
  ValidateIf,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { EmployeePosition } from '@prisma/client'

const FACTORY_POSITIONS = [
  EmployeePosition.FACTORY_DIRECTOR,
  EmployeePosition.FACTORY_PLANNER,
  EmployeePosition.MECHANIC,
]
const LINE_POSITIONS = [EmployeePosition.LINE_LEADER, EmployeePosition.LINE_DEPUTY]

export class CreateEmployeeDto {
  @ApiPropertyOptional({ description: 'Mã nhân viên — tự sinh nếu bỏ trống' })
  @IsString()
  @IsOptional()
  code?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  fullName: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phone?: string

  @ApiPropertyOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsOptional()
  email?: string

  @ApiProperty({ enum: EmployeePosition })
  @IsEnum(EmployeePosition, { message: 'Chức vụ không hợp lệ' })
  position: EmployeePosition

  @ValidateIf((o) => FACTORY_POSITIONS.includes(o.position) && !LINE_POSITIONS.includes(o.position))
  @IsInt({ message: 'factoryId bắt buộc cho chức vụ này' })
  @IsOptional()
  @Type(() => Number)
  factoryId?: number

  @ValidateIf((o) => LINE_POSITIONS.includes(o.position))
  @IsInt({ message: 'lineId bắt buộc cho Tổ trưởng/Tổ phó' })
  @IsOptional()
  @Type(() => Number)
  lineId?: number
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
