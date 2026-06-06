import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateSettingsDto } from './dto/settings.dto'

// Các key cấu hình lưu trong bảng AppSetting
export const SETTING_KEYS = {
  QC_REPORTING_ENABLED: 'QC_REPORTING_ENABLED',
  CUTTING_RATE_PCT: 'CUTTING_RATE_PCT',
  FINISHING_RATE_PCT: 'FINISHING_RATE_PCT',
  PAYROLL_WORKING_DAYS: 'PAYROLL_WORKING_DAYS',
} as const

// Giá trị mặc định khi chưa cấu hình
const DEFAULTS = {
  CUTTING_RATE_PCT: 8,
  FINISHING_RATE_PCT: 5,
  PAYROLL_WORKING_DAYS: 26,
}

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  // Cutoff vẫn lấy từ env để giới hạn phạm vi (không cho sửa runtime)
  private get cutoffHour(): number {
    return parseInt(this.config.get('OUTPUT_CUTOFF_HOUR') ?? '19', 10)
  }

  // Đọc 1 setting dạng boolean (mặc định false nếu chưa có)
  async getBool(key: string, fallback = false): Promise<boolean> {
    const row = await this.prisma.appSetting.findUnique({ where: { key } })
    if (!row) return fallback
    return row.value === 'true'
  }

  // Đọc 1 setting dạng số (mặc định fallback nếu chưa có / không hợp lệ)
  async getNumber(key: string, fallback: number): Promise<number> {
    const row = await this.prisma.appSetting.findUnique({ where: { key } })
    if (!row) return fallback
    const n = Number(row.value)
    return Number.isFinite(n) ? n : fallback
  }

  private async setValue(key: string, value: string) {
    await this.prisma.appSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
  }

  async get() {
    const [
      qcReportingEnabled,
      cuttingRatePct,
      finishingRatePct,
      payrollWorkingDays,
    ] = await Promise.all([
      this.getBool(SETTING_KEYS.QC_REPORTING_ENABLED, false),
      this.getNumber(SETTING_KEYS.CUTTING_RATE_PCT, DEFAULTS.CUTTING_RATE_PCT),
      this.getNumber(
        SETTING_KEYS.FINISHING_RATE_PCT,
        DEFAULTS.FINISHING_RATE_PCT,
      ),
      this.getNumber(
        SETTING_KEYS.PAYROLL_WORKING_DAYS,
        DEFAULTS.PAYROLL_WORKING_DAYS,
      ),
    ])
    return {
      cutoffHour: this.cutoffHour,
      qcReportingEnabled,
      cuttingRatePct,
      finishingRatePct,
      payrollWorkingDays,
    }
  }

  async update(dto: UpdateSettingsDto) {
    if (dto.qcReportingEnabled !== undefined) {
      await this.setValue(
        SETTING_KEYS.QC_REPORTING_ENABLED,
        String(dto.qcReportingEnabled),
      )
    }
    if (dto.cuttingRatePct !== undefined) {
      await this.setValue(
        SETTING_KEYS.CUTTING_RATE_PCT,
        String(dto.cuttingRatePct),
      )
    }
    if (dto.finishingRatePct !== undefined) {
      await this.setValue(
        SETTING_KEYS.FINISHING_RATE_PCT,
        String(dto.finishingRatePct),
      )
    }
    if (dto.payrollWorkingDays !== undefined) {
      await this.setValue(
        SETTING_KEYS.PAYROLL_WORKING_DAYS,
        String(dto.payrollWorkingDays),
      )
    }
    return this.get()
  }
}
