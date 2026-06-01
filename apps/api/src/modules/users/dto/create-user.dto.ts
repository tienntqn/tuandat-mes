import { IsString, IsInt, IsBoolean, IsOptional, MinLength, MaxLength, IsArray } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateUserDto {
  @ApiProperty({ description: 'ID nhân viên liên kết' })
  @IsInt()
  employeeId: number

  @ApiProperty({ example: 'nguyen_van_a' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string

  @ApiPropertyOptional({ type: [Number], description: 'Danh sách roleId' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  roleIds?: number[]
}

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  roleIds?: number[]
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  newPassword: string
}
