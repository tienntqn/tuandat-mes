import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FactorySection } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import {
  CreateDailyOutputDto,
  CreateSectionOutputDto,
  CreateFinishingDto,
} from './dto/output.dto'
import { SettingsService, SETTING_KEYS } from '../settings/settings.service'
import type { RequestUser } from '../../common/types/request-user.type'

// Map vị trí (position) → tổ cấp xưởng nhập theo màu × size
const POSITION_SECTION: Record<string, FactorySection> = {
  CUTTING_LEADER: FactorySection.CUTTING,
  QC_LEADER: FactorySection.QC,
}

@Injectable()
export class OutputService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private settings: SettingsService,
  ) {}

  // Giờ cutoff từ env, mặc định 19
  private get cutoffHour(): number {
    return parseInt(this.config.get('OUTPUT_CUTOFF_HOUR') ?? '19', 10)
  }

  // Kiểm tra đã qua cutoff time chưa
  private isPastCutoff(date: Date): boolean {
    const now = new Date()
    const targetDate = new Date(date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    targetDate.setHours(0, 0, 0, 0)

    // Nếu nhập cho ngày trong quá khứ → luôn locked
    if (targetDate < today) return true

    // Nếu nhập cho hôm nay → kiểm tra giờ
    const hour = now.getHours()
    return hour >= this.cutoffHour
  }

  // Lấy danh sách Style đang gán cho chuyền (qua StyleLine)
  async getStylesForLine(lineId: number) {
    const styleLines = await this.prisma.styleLine.findMany({
      where: { lineId },
      include: {
        style: {
          include: {
            customer: true,
            styleColors: { include: { color: true } },
            styleSizes: { include: { size: true } },
          },
        },
      },
    })
    return styleLines.map((sl) => sl.style)
  }

  // Lấy sản lượng hôm nay của một chuyền, kèm kế hoạch để tính %
  async getTodayOutput(lineId: number) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const outputs = await this.prisma.dailyOutput.findMany({
      where: {
        lineId,
        outputDate: today,
      },
      include: {
        style: true,
        color: true,
        size: true,
      },
      orderBy: { enteredAt: 'desc' },
    })

    // Lấy kế hoạch ngày từ FactoryPlan (tính plannedQuantity / số ngày còn lại)
    // Tìm các FactoryPlan active của chuyền này
    const factoryPlans = await this.prisma.factoryPlan.findMany({
      where: {
        lineId,
        expectedFinishDate: { gte: today },
      },
      include: {
        companyPlan: {
          include: { style: true },
        },
      },
    })

    const cutoffHour = this.cutoffHour
    const isPastCutoff = this.isPastCutoff(today)

    return {
      date: today,
      isPastCutoff,
      cutoffHour,
      outputs,
      factoryPlans,
    }
  }

  // UPSERT sản lượng (Rule 1: lấy lần cuối; Rule 2: audit log)
  async upsertOutput(user: RequestUser, dto: CreateDailyOutputDto) {
    const lineId = user.lineId
    if (!lineId) {
      throw new ForbiddenException('Tài khoản chưa được gán chuyền')
    }

    // Chuyền chỉ nhập công đoạn May (Cắt/KCS/Đóng gói do tổ cấp xưởng đảm nhận)
    if (dto.stage !== 'SEWING') {
      throw new BadRequestException(
        'Chuyền chỉ được nhập công đoạn May. Cắt/KCS/Đóng gói do tổ cấp xưởng nhập.',
      )
    }

    // Parse ngày
    const outputDate = dto.outputDate
      ? new Date(dto.outputDate)
      : new Date()
    outputDate.setHours(0, 0, 0, 0)

    // Rule 3: kiểm tra cutoff
    if (this.isPastCutoff(outputDate)) {
      throw new BadRequestException(
        `Đã qua giờ khóa sản lượng (${this.cutoffHour}:00). Không thể nhập/sửa ngày này.`,
      )
    }

    // Kiểm tra style có thuộc chuyền này không (qua StyleLine)
    const styleLine = await this.prisma.styleLine.findUnique({
      where: {
        lineId_styleId: { lineId, styleId: dto.styleId },
      },
    })
    if (!styleLine) {
      throw new BadRequestException('Mã hàng không thuộc chuyền của bạn')
    }

    // UPSERT theo (lineId, styleId, colorId, sizeId, stage, outputDate) — lấy lần cuối.
    // Dùng findFirst để xử lý đúng cả trường hợp colorId/sizeId null (dữ liệu cũ mức Style).
    const colorId = dto.colorId ?? null
    const sizeId = dto.sizeId ?? null
    const existing = await this.prisma.dailyOutput.findFirst({
      where: {
        lineId,
        styleId: dto.styleId,
        colorId,
        sizeId,
        stage: dto.stage,
        outputDate,
      },
    })

    let dailyOutput: { id: number }
    if (existing) {
      // Cập nhật ghi đè
      dailyOutput = await this.prisma.dailyOutput.update({
        where: { id: existing.id },
        data: {
          quantity: dto.quantity,
          enteredBy: user.employeeId,
          enteredAt: new Date(),
        },
      })
    } else {
      dailyOutput = await this.prisma.dailyOutput.create({
        data: {
          lineId,
          styleId: dto.styleId,
          colorId,
          sizeId,
          stage: dto.stage,
          outputDate,
          quantity: dto.quantity,
          enteredBy: user.employeeId,
          enteredAt: new Date(),
        },
      })
    }

    // Rule 2: audit log — lưu MỌI lần nhập
    await this.prisma.dailyOutputLog.create({
      data: {
        dailyOutputId: dailyOutput.id,
        quantity: dto.quantity,
        enteredBy: user.employeeId,
        enteredAt: new Date(),
      },
    })

    return this.prisma.dailyOutput.findUnique({
      where: { id: dailyOutput.id },
      include: { style: true },
    })
  }

  // Lịch sử sản lượng của chuyền (N ngày gần nhất)
  async getHistory(lineId: number, days = 7) {
    const from = new Date()
    from.setDate(from.getDate() - days + 1)
    from.setHours(0, 0, 0, 0)

    const outputs = await this.prisma.dailyOutput.findMany({
      where: {
        lineId,
        outputDate: { gte: from },
      },
      include: {
        style: true,
      },
      orderBy: [{ outputDate: 'desc' }, { stage: 'asc' }],
    })

    return outputs
  }

  // Lấy audit log của một bản ghi sản lượng
  async getOutputLogs(outputId: number, user: RequestUser) {
    const output = await this.prisma.dailyOutput.findUnique({
      where: { id: outputId },
    })
    if (!output) throw new BadRequestException('Không tìm thấy bản ghi sản lượng')

    // Data scope
    if (user.dataScope.type === 'LINE' && output.lineId !== user.lineId) {
      throw new ForbiddenException('Không có quyền xem')
    }
    if (user.dataScope.type === 'FACTORY') {
      const line = await this.prisma.productionLine.findUnique({ where: { id: output.lineId } })
      if (line?.factoryId !== user.factoryId) {
        throw new ForbiddenException('Không có quyền xem')
      }
    }

    return this.prisma.dailyOutputLog.findMany({
      where: { dailyOutputId: outputId },
      orderBy: { enteredAt: 'desc' },
    })
  }

  // Lấy settings cutoff
  getSettings() {
    return { cutoffHour: this.cutoffHour }
  }

  // Lấy sản lượng theo khoảng ngày (dùng cho báo cáo / manager view)
  async getOutputRange(lineId: number, from: Date, to: Date) {
    return this.prisma.dailyOutput.findMany({
      where: {
        lineId,
        outputDate: { gte: from, lte: to },
      },
      include: { style: true },
      orderBy: [{ outputDate: 'asc' }, { stage: 'asc' }],
    })
  }

  // ==========================================================
  // TỔ CẤP XƯỞNG (Cắt / KCS) — nhập theo màu × size
  // ==========================================================

  // Suy ra section từ position; ném lỗi nếu vị trí không phải tổ section
  private sectionForPosition(position: string): FactorySection {
    const section = POSITION_SECTION[position]
    if (!section) {
      throw new ForbiddenException('Tài khoản không thuộc tổ Cắt/KCS')
    }
    return section
  }

  // Chặn nếu là tổ KCS nhưng cấu hình KCS đang tắt
  private async assertSectionEnabled(section: FactorySection) {
    if (section === FactorySection.QC) {
      const enabled = await this.settings.getBool(
        SETTING_KEYS.QC_REPORTING_ENABLED,
        false,
      )
      if (!enabled) {
        throw new BadRequestException('Bộ phận KCS chưa được bật báo cáo sản lượng')
      }
    }
  }

  // Danh sách mã hàng xưởng đang sản xuất (qua StyleLine của các chuyền thuộc xưởng)
  async getFactoryStyles(factoryId: number) {
    const styleLines = await this.prisma.styleLine.findMany({
      where: { line: { factoryId } },
      include: {
        style: {
          include: {
            customer: true,
            styleColors: { include: { color: true } },
            styleSizes: { include: { size: true } },
          },
        },
      },
    })
    // Khử trùng lặp (1 mã hàng có thể ở nhiều chuyền của xưởng)
    const map = new Map<number, (typeof styleLines)[number]['style']>()
    for (const sl of styleLines) map.set(sl.styleId, sl.style)
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code))
  }

  // Sản lượng hôm nay của 1 tổ section trong xưởng
  async getSectionToday(factoryId: number, section: FactorySection) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const outputs = await this.prisma.factorySectionOutput.findMany({
      where: { factoryId, section, outputDate: today },
      include: { style: true, color: true, size: true },
      orderBy: { enteredAt: 'desc' },
    })

    return {
      date: today,
      isPastCutoff: this.isPastCutoff(today),
      cutoffHour: this.cutoffHour,
      section,
      outputs,
    }
  }

  // UPSERT sản lượng tổ cấp xưởng (lấy lần cuối + audit log)
  async upsertSectionOutput(user: RequestUser, dto: CreateSectionOutputDto) {
    const factoryId = user.factoryId
    if (!factoryId) {
      throw new ForbiddenException('Tài khoản chưa được gán xưởng')
    }

    // Section phải khớp vị trí của user
    const expected = this.sectionForPosition(user.position)
    if (dto.section !== expected) {
      throw new ForbiddenException('Bạn không có quyền nhập cho tổ này')
    }
    await this.assertSectionEnabled(dto.section)

    const outputDate = dto.outputDate ? new Date(dto.outputDate) : new Date()
    outputDate.setHours(0, 0, 0, 0)

    if (this.isPastCutoff(outputDate)) {
      throw new BadRequestException(
        `Đã qua giờ khóa sản lượng (${this.cutoffHour}:00). Không thể nhập/sửa ngày này.`,
      )
    }

    // Mã hàng phải thuộc xưởng (đang sản xuất qua StyleLine)
    const styleInFactory = await this.prisma.styleLine.findFirst({
      where: { styleId: dto.styleId, line: { factoryId } },
    })
    if (!styleInFactory) {
      throw new BadRequestException('Mã hàng không thuộc xưởng của bạn')
    }

    // Chế độ tổng (mã hàng không theo màu/size) → colorId/sizeId = null, bỏ qua kiểm tra trần PoItem
    const colorId = dto.colorId ?? null
    const sizeId = dto.sizeId ?? null

    // Trần hợp lý: 1 ô màu×size không vượt tổng đã đặt của mã hàng (chỉ khi có màu/size)
    if (colorId != null && sizeId != null) {
      const ordered = await this.prisma.poItem.aggregate({
        where: {
          colorId,
          sizeId,
          po: { styleId: dto.styleId, deletedAt: null },
        },
        _sum: { quantity: true },
      })
      const orderedQty = ordered._sum.quantity ?? 0
      if (orderedQty > 0 && dto.quantity > orderedQty) {
        throw new BadRequestException(
          `Số lượng (${dto.quantity}) vượt tổng đã đặt (${orderedQty}) của màu/size này`,
        )
      }
    }

    // Dùng findFirst để upsert đúng cả khi colorId/sizeId là null
    const existing = await this.prisma.factorySectionOutput.findFirst({
      where: {
        factoryId,
        section: dto.section,
        styleId: dto.styleId,
        colorId,
        sizeId,
        outputDate,
      },
    })

    let output: { id: number }
    if (existing) {
      output = await this.prisma.factorySectionOutput.update({
        where: { id: existing.id },
        data: { quantity: dto.quantity, enteredBy: user.employeeId, enteredAt: new Date() },
      })
    } else {
      output = await this.prisma.factorySectionOutput.create({
        data: {
          factoryId,
          section: dto.section,
          styleId: dto.styleId,
          colorId,
          sizeId,
          outputDate,
          quantity: dto.quantity,
          enteredBy: user.employeeId,
          enteredAt: new Date(),
        },
      })
    }

    // Audit log
    await this.prisma.factorySectionOutputLog.create({
      data: {
        factorySectionOutputId: output.id,
        quantity: dto.quantity,
        enteredBy: user.employeeId,
        enteredAt: new Date(),
      },
    })

    return this.prisma.factorySectionOutput.findUnique({
      where: { id: output.id },
      include: { style: true, color: true, size: true },
    })
  }

  // ==========================================================
  // TỔ HOÀN THÀNH — nhập theo PO (nhận từ chuyền + đóng thùng)
  // ==========================================================

  // Danh sách PO xưởng đang làm (PO của các mã hàng có StyleLine ở chuyền thuộc xưởng)
  async getFinishingPos(factoryId: number) {
    const styleLines = await this.prisma.styleLine.findMany({
      where: { line: { factoryId } },
      select: { styleId: true },
    })
    const styleIds = [...new Set(styleLines.map((s) => s.styleId))]
    if (styleIds.length === 0) return []

    return this.prisma.purchaseOrder.findMany({
      where: { styleId: { in: styleIds }, deletedAt: null },
      include: { style: true },
      orderBy: { poNumber: 'asc' },
    })
  }

  // Sản lượng hoàn thành hôm nay của xưởng
  async getFinishingToday(factoryId: number) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const outputs = await this.prisma.finishingOutput.findMany({
      where: { factoryId, outputDate: today },
      include: { po: { include: { style: true } } },
      orderBy: { enteredAt: 'desc' },
    })

    return {
      date: today,
      isPastCutoff: this.isPastCutoff(today),
      cutoffHour: this.cutoffHour,
      outputs,
    }
  }

  // UPSERT sản lượng tổ hoàn thành (lấy lần cuối + audit log)
  async upsertFinishing(user: RequestUser, dto: CreateFinishingDto) {
    const factoryId = user.factoryId
    if (!factoryId) {
      throw new ForbiddenException('Tài khoản chưa được gán xưởng')
    }
    if (user.position !== 'FINISHING_LEADER') {
      throw new ForbiddenException('Bạn không có quyền nhập cho tổ Hoàn thành')
    }

    // packed ≤ received
    if (dto.packedQuantity > dto.receivedQuantity) {
      throw new BadRequestException(
        'Số lượng đã đóng thùng không thể lớn hơn số lượng đã nhận',
      )
    }

    const outputDate = dto.outputDate ? new Date(dto.outputDate) : new Date()
    outputDate.setHours(0, 0, 0, 0)

    if (this.isPastCutoff(outputDate)) {
      throw new BadRequestException(
        `Đã qua giờ khóa sản lượng (${this.cutoffHour}:00). Không thể nhập/sửa ngày này.`,
      )
    }

    // PO phải thuộc xưởng (mã hàng đang sản xuất ở chuyền thuộc xưởng)
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: dto.poId, deletedAt: null },
    })
    if (!po) throw new BadRequestException('Không tìm thấy PO')
    const styleInFactory = await this.prisma.styleLine.findFirst({
      where: { styleId: po.styleId, line: { factoryId } },
    })
    if (!styleInFactory) {
      throw new BadRequestException('PO không thuộc xưởng của bạn')
    }
    // Trần hợp lý: không vượt tổng SL của PO
    if (dto.receivedQuantity > po.totalQuantity) {
      throw new BadRequestException(
        `Số lượng nhận (${dto.receivedQuantity}) vượt tổng PO (${po.totalQuantity})`,
      )
    }

    const existing = await this.prisma.finishingOutput.findFirst({
      where: { factoryId, poId: dto.poId, outputDate },
    })

    let output: { id: number }
    if (existing) {
      output = await this.prisma.finishingOutput.update({
        where: { id: existing.id },
        data: {
          receivedQuantity: dto.receivedQuantity,
          packedQuantity: dto.packedQuantity,
          enteredBy: user.employeeId,
          enteredAt: new Date(),
        },
      })
    } else {
      output = await this.prisma.finishingOutput.create({
        data: {
          factoryId,
          poId: dto.poId,
          outputDate,
          receivedQuantity: dto.receivedQuantity,
          packedQuantity: dto.packedQuantity,
          enteredBy: user.employeeId,
          enteredAt: new Date(),
        },
      })
    }

    await this.prisma.finishingOutputLog.create({
      data: {
        finishingOutputId: output.id,
        receivedQuantity: dto.receivedQuantity,
        packedQuantity: dto.packedQuantity,
        enteredBy: user.employeeId,
        enteredAt: new Date(),
      },
    })

    return this.prisma.finishingOutput.findUnique({
      where: { id: output.id },
      include: { po: { include: { style: true } } },
    })
  }
}
