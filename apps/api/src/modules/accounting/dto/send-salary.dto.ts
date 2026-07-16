import { IsArray, IsInt, IsOptional } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class SendSalaryDto {
  @ApiPropertyOptional({
    description: 'Danh sách id SalarySlip cần gửi — bỏ trống để gửi tất cả các dòng chưa gửi',
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  @Type(() => Number)
  slipIds?: number[]
}
