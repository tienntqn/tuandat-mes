import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength, Max, Min } from 'class-validator'

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

  // Tên máy in tem QR (tham chiếu — đặt làm máy in mặc định của OS để in trực tiếp)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  qrPrinterName?: string

  // Khổ tem QR (mm)
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(300)
  qrLabelWidthMm?: number

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(300)
  qrLabelHeightMm?: number

  // Ngưỡng chi phí phải trình công ty duyệt (0 = mọi hồ sơ đều qua 2 cấp)
  @IsOptional()
  @IsNumber()
  @Min(0)
  machineCompanyApprovalThreshold?: number

  // Số ngày báo trước khi chứng chỉ/kiểm định máy hết hạn
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  machineCertAlertDays?: number
}
