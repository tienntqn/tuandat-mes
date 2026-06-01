import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { FactoryStatus } from '@prisma/client'

export class CreateProductionLineDto {
  @ApiProperty()
  @IsInt({ message: 'factoryId phải là số nguyên' })
  @Type(() => Number)
  factoryId: number

  @ApiProperty()
  @IsInt({ message: 'Số chuyền phải là số nguyên' })
  @Min(1)
  @Type(() => Number)
  lineNumber: number

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên chuyền không được để trống' })
  name: string

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  capacity?: number

  @ApiPropertyOptional({ enum: FactoryStatus })
  @IsEnum(FactoryStatus, { message: 'Trạng thái không hợp lệ' })
  @IsOptional()
  status?: FactoryStatus
}

export class UpdateProductionLineDto extends PartialType(CreateProductionLineDto) {}
