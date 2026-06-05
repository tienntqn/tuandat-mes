import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateSettingsDto } from './dto/settings.dto'

// Các key cấu hình lưu trong bảng AppSetting
export const SETTING_KEYS = {
  QC_REPORTING_ENABLED: 'QC_REPORTING_ENABLED',
} as const

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

  async get() {
    const qcReportingEnabled = await this.getBool(
      SETTING_KEYS.QC_REPORTING_ENABLED,
      false,
    )
    return {
      cutoffHour: this.cutoffHour,
      qcReportingEnabled,
    }
  }

  async update(dto: UpdateSettingsDto) {
    if (dto.qcReportingEnabled !== undefined) {
      await this.prisma.appSetting.upsert({
        where: { key: SETTING_KEYS.QC_REPORTING_ENABLED },
        create: {
          key: SETTING_KEYS.QC_REPORTING_ENABLED,
          value: String(dto.qcReportingEnabled),
        },
        update: { value: String(dto.qcReportingEnabled) },
      })
    }
    return this.get()
  }
}
