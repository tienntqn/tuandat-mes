import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { FactoryStatus } from '@prisma/client'

export class CreateProductionLineDto {
  @ApiProperty()
  @IsInt({ message: 'factoryId phải là số nguyên' })
  @Type(() => Number)
  factoryId: number

  @ApiPropertyOptional({ description: 'Số thứ tự chuyền — tự sinh nếu bỏ trống' })
  @IsInt({ message: 'Số chuyền phải là số nguyên' })
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  lineNumber?: number

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên chuyền không được để trống' })
  name: string

  @ApiPropertyOptional({ description: 'Số công nhân của chuyền (mặc định 10)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  workerCount?: number

  @ApiPropertyOptional({ enum: FactoryStatus })
  @IsEnum(FactoryStatus, { message: 'Trạng thái không hợp lệ' })
  @IsOptional()
  status?: FactoryStatus
}

export class UpdateProductionLineDto extends PartialType(CreateProductionLineDto) {}
