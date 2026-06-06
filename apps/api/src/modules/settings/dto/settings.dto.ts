import { IsBoolean, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator'

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  qcReportingEnabled?: boolean

  // % đơn giá chuyền may mà tổ Cắt được hưởng (0-100)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cuttingRatePct?: number

  // % đơn giá chuyền may mà tổ Hoàn thành được hưởng (0-100)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  finishingRatePct?: number

  // Số ngày công chuẩn trong tháng (dùng để ngoại suy lương cuối tháng)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  payrollWorkingDays?: number
}
