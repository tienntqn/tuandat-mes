import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { PrismaService } from '../prisma/prisma.service'
import { MailService } from '../mail/mail.service'
import { NUMBER_COLUMNS, TEXT_COLUMNS, EMAIL_COLUMN, cellStr, cellNum, findHeaderRowIndex, findFirstDataRowIndex, isDataRow } from './salary-columns'
import { renderSalaryEmailHtml } from './salary-email.template'
import { SendSalaryDto } from './dto/send-salary.dto'

const MAX_DATA_ROWS = 2000 // giới hạn an toàn khi dò dòng dữ liệu

@Injectable()
export class AccountingService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  async listPeriods() {
    const periods = await this.prisma.salaryPeriod.findMany({
      where: { deletedAt: null },
      include: {
        uploader: { select: { id: true, username: true } },
        _count: { select: { slips: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })
    const periodIds = periods.map((p) => p.id)
    const sentCounts = await this.prisma.salarySlip.groupBy({
      by: ['periodId'],
      where: { periodId: { in: periodIds }, emailSentAt: { not: null } },
      _count: { _all: true },
    })
    const totals = await this.prisma.salarySlip.groupBy({
      by: ['periodId'],
      where: { periodId: { in: periodIds } },
      _sum: { netSalary: true },
    })
    const sentMap = new Map(sentCounts.map((s) => [s.periodId, s._count._all]))
    const totalMap = new Map(totals.map((t) => [t.periodId, t._sum.netSalary ?? 0]))
    return periods.map((p) => ({
      ...p,
      slipCount: p._count.slips,
      sentCount: sentMap.get(p.id) ?? 0,
      totalNetSalary: totalMap.get(p.id) ?? 0,
    }))
  }

  private async findPeriod(id: number) {
    const period = await this.prisma.salaryPeriod.findFirst({ where: { id, deletedAt: null } })
    if (!period) throw new NotFoundException('Kỳ lương không tồn tại')
    return period
  }

  async getPeriod(id: number) {
    const period = await this.findPeriod(id)
    const slips = await this.prisma.salarySlip.findMany({
      where: { periodId: id },
      include: { employee: { select: { id: true, code: true, fullName: true } } },
      orderBy: [{ department: 'asc' }, { fullName: 'asc' }],
    })
    return { ...period, slips }
  }

  // Đọc file Excel bảng lương (cột B..AH + AP) và tạo/ghi đè 1 kỳ lương
  async uploadPeriod(
    buffer: Buffer,
    month: number,
    year: number,
    userId: number,
    originalFileName: string,
  ) {
    let workbook: XLSX.WorkBook
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' })
    } catch {
      throw new BadRequestException('Không đọc được file — vui lòng kiểm tra lại định dạng .xlsx')
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!sheet) throw new BadRequestException('File Excel không có sheet dữ liệu')

    const headerRow = findHeaderRowIndex(sheet)
    const firstDataRow = findFirstDataRowIndex(sheet, headerRow)
    const rows: Array<Record<string, unknown>> = []
    for (let r = firstDataRow; r < firstDataRow + MAX_DATA_ROWS; r++) {
      if (!isDataRow(sheet, r)) break
      const rowData: Record<string, unknown> = {}
      for (const [col, field] of Object.entries(TEXT_COLUMNS)) {
        rowData[field] = cellStr(sheet, r, col)
      }
      for (const [col, field] of Object.entries(NUMBER_COLUMNS)) {
        rowData[field] = cellNum(sheet, r, col)
      }
      rowData['email'] = cellStr(sheet, r, EMAIL_COLUMN)
      rows.push(rowData)
    }

    if (rows.length === 0) {
      throw new BadRequestException('Không tìm thấy dòng dữ liệu nhân viên nào trong file')
    }

    // Tra cứu nhân viên khớp MSNV để gắn employeeId + fallback email
    const codes = [...new Set(rows.map((r) => String(r.employeeCode)).filter(Boolean))]
    const employees = await this.prisma.employee.findMany({
      where: { code: { in: codes }, deletedAt: null },
      select: { id: true, code: true, email: true },
    })
    const employeeByCode = new Map(employees.map((e) => [e.code, e]))

    const slipsData = rows.map((r) => {
      const employee = employeeByCode.get(String(r.employeeCode))
      const fileEmail = String(r.email ?? '').trim()
      return {
        employeeId: employee?.id ?? null,
        employeeCode: String(r.employeeCode),
        fullName: String(r.fullName),
        department: String(r.department) || null,
        bankAccount: String(r.bankAccount) || null,
        email: fileEmail || employee?.email || null,
        workDays: r.workDays as number,
        otSundayNight: r.otSundayNight as number,
        otNormalHours: r.otNormalHours as number,
        totalWorkHours: r.totalWorkHours as number,
        convertedWorkDays: r.convertedWorkDays as number,
        workCoefficient: r.workCoefficient as number,
        salaryRate: r.salaryRate as number,
        otNormalPay: r.otNormalPay as number,
        performanceCoefficient: r.performanceCoefficient as number,
        salarySupport: r.salarySupport as number,
        fuelAllowance: r.fuelAllowance as number,
        attendanceBonus: r.attendanceBonus as number,
        incentiveBonus: r.incentiveBonus as number,
        holidayPay: r.holidayPay as number,
        paidPersonalLeave: r.paidPersonalLeave as number,
        leaveSupport: r.leaveSupport as number,
        leaveDays: r.leaveDays as number,
        leavePay: r.leavePay as number,
        trainingDays: r.trainingDays as number,
        menstrualHours: r.menstrualHours as number,
        womenSpecialPay: r.womenSpecialPay as number,
        totalSalary: r.totalSalary as number,
        unemploymentInsurance: r.unemploymentInsurance as number,
        socialInsurance: r.socialInsurance as number,
        otherDeduction: r.otherDeduction as number,
        advanceDeduction: r.advanceDeduction as number,
        personalIncomeTax: r.personalIncomeTax as number,
        netSalary: r.netSalary as number,
      }
    })

    const period = await this.prisma.$transaction(async (tx) => {
      const activePeriod = await tx.salaryPeriod.findFirst({
        where: { month, year, deletedAt: null },
      })
      if (activePeriod) {
        const sentCount = await tx.salarySlip.count({
          where: { periodId: activePeriod.id, emailSentAt: { not: null } },
        })
        if (sentCount > 0) {
          throw new BadRequestException(
            `Kỳ lương tháng ${month}/${year} đã gửi email cho ${sentCount} nhân viên, không thể upload lại. Vui lòng xoá kỳ lương cũ nếu muốn nhập lại từ đầu.`,
          )
        }
      }

      const deletedPeriod = await tx.salaryPeriod.findFirst({
        where: { month, year, deletedAt: { not: null } },
        orderBy: { updatedAt: 'desc' },
      })

      const targetPeriod = activePeriod ?? deletedPeriod
      const periodRecord = targetPeriod
        ? await tx.salaryPeriod.update({
            where: { id: targetPeriod.id },
            data: { sourceFileName: originalFileName, uploadedBy: userId, uploadedAt: new Date(), deletedAt: null },
          })
        : await tx.salaryPeriod.create({
            data: { month, year, sourceFileName: originalFileName, uploadedBy: userId },
          })

      await tx.salarySlip.deleteMany({ where: { periodId: periodRecord.id } })
      await tx.salarySlip.createMany({
        data: slipsData.map((s) => ({ ...s, periodId: periodRecord.id })),
      })
      return periodRecord
    })

    const matched = slipsData.filter((s) => s.employeeId != null).length
    return {
      period,
      totalRows: slipsData.length,
      matched,
      unmatched: slipsData.length - matched,
    }
  }

  async sendEmails(periodId: number, dto: SendSalaryDto) {
    const period = await this.findPeriod(periodId)
    const where: any = { periodId }
    if (dto.slipIds && dto.slipIds.length > 0) {
      where.id = { in: dto.slipIds }
    } else {
      where.emailSentAt = null
    }
    const slips = await this.prisma.salarySlip.findMany({ where })

    let sent = 0
    const errors: Array<{ slipId: number; employeeCode: string; error: string }> = []

    for (const slip of slips) {
      if (!slip.email) {
        errors.push({ slipId: slip.id, employeeCode: slip.employeeCode, error: 'Không có email' })
        await this.prisma.salarySlip.update({
          where: { id: slip.id },
          data: { emailError: 'Không có email' },
        })
        continue
      }
      try {
        await this.mail.sendMail({
          to: slip.email,
          subject: `Bảng lương tháng ${period.month}/${period.year} — ${slip.fullName}`,
          html: renderSalaryEmailHtml(slip, period.month, period.year),
        })
        await this.prisma.salarySlip.update({
          where: { id: slip.id },
          data: { emailSentAt: new Date(), emailError: null },
        })
        sent++
      } catch (err) {
        const message = (err as Error).message
        errors.push({ slipId: slip.id, employeeCode: slip.employeeCode, error: message })
        await this.prisma.salarySlip.update({
          where: { id: slip.id },
          data: { emailError: message },
        })
      }
    }

    return { sent, failed: errors.length, errors }
  }

  async deletePeriod(id: number) {
    await this.findPeriod(id)
    await this.prisma.salaryPeriod.update({ where: { id }, data: { deletedAt: new Date() } })
    return { message: 'Đã xoá kỳ lương' }
  }
}
