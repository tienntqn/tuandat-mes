import { IsString, IsNotEmpty, IsOptional, IsInt, Min, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class CreateSizeDto {
  @ApiPropertyOptional({ description: 'Mã size — tự sinh nếu bỏ trống (vd S, M, L)' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  code?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Tên size không được để trống' })
  @MaxLength(100)
  name: string

  @ApiPropertyOptional({ description: 'Thứ tự sắp xếp (S<M<L<XL...)' })
  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number
}

export class UpdateSizeDto extends PartialType(CreateSizeDto) {}
