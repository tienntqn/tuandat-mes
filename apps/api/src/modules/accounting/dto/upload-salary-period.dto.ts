import { IsInt, Max, Min } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class UploadSalaryPeriodDto {
  @ApiProperty({ description: 'Tháng (1-12)' })
  @IsInt({ message: 'Tháng phải là số nguyên' })
  @Min(1, { message: 'Tháng phải từ 1 đến 12' })
  @Max(12, { message: 'Tháng phải từ 1 đến 12' })
  @Type(() => Number)
  month: number

  @ApiProperty({ description: 'Năm (vd 2026)' })
  @IsInt({ message: 'Năm phải là số nguyên' })
  @Min(2000, { message: 'Năm không hợp lệ' })
  @Type(() => Number)
  year: number
}
