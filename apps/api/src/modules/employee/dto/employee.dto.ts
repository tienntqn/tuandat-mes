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
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Mã nhân viên không được để trống' })
  code: string

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

  // Bắt buộc khi position là FACTORY_DIRECTOR, FACTORY_PLANNER, MECHANIC
  @ValidateIf((o) => FACTORY_POSITIONS.includes(o.position) && !LINE_POSITIONS.includes(o.position))
  @IsInt({ message: 'factoryId bắt buộc cho chức vụ này' })
  @IsOptional()
  @Type(() => Number)
  factoryId?: number

  // Bắt buộc khi position là LINE_LEADER, LINE_DEPUTY
  @ValidateIf((o) => LINE_POSITIONS.includes(o.position))
  @IsInt({ message: 'lineId bắt buộc cho Tổ trưởng/Tổ phó' })
  @IsOptional()
  @Type(() => Number)
  lineId?: number
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {}
