import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { CreateDailyOutputDto } from './dto/output.dto'
import type { RequestUser } from '../../common/types/request-user.type'

@Injectable()
export class OutputService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
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
          include: { customer: true },
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

    // UPSERT: unique(lineId, styleId, stage, outputDate)
    const existing = await this.prisma.dailyOutput.findUnique({
      where: {
        lineId_styleId_stage_outputDate: {
          lineId,
          styleId: dto.styleId,
          stage: dto.stage,
          outputDate,
        },
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
}
