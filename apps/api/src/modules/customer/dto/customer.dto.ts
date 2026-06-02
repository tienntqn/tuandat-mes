import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'

export class CreateCustomerDto {
  @ApiPropertyOptional({ description: 'Mã khách hàng — tự sinh nếu bỏ trống' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên khách hàng không được để trống' })
  @MaxLength(200)
  name: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  country?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactInfo?: string
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
