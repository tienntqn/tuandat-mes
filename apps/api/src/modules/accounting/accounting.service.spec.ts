import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { AccountingService } from './accounting.service'
import { PrismaService } from '../prisma/prisma.service'
import { MailService } from '../mail/mail.service'

const mockPrisma = {
  salaryPeriod: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  salarySlip: {
    count: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  },
  employee: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
}

const mockMail = {
  sendMail: jest.fn(),
}

describe('AccountingService — uploadPeriod', () => {
  let service: AccountingService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AccountingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMail },
      ],
    }).compile()

    service = module.get(AccountingService)
    jest.clearAllMocks()
  })

  it('cho phép upload lại khi kỳ cũ đã bị xoá mềm', async () => {
    mockPrisma.salaryPeriod.findFirst.mockResolvedValueOnce(null)
    mockPrisma.salaryPeriod.findFirst.mockResolvedValueOnce({ id: 11, month: 6, year: 2026, deletedAt: new Date() })
    mockPrisma.salarySlip.count.mockResolvedValue(0)
    mockPrisma.employee.findMany.mockResolvedValue([{ id: 1, code: 'NV001', email: 'a@company.com' }])
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma))
    mockPrisma.salaryPeriod.update.mockResolvedValue({ id: 11, month: 6, year: 2026 })
    mockPrisma.salarySlip.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.salarySlip.createMany.mockResolvedValue({ count: 1 })

    const workbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {
          '!ref': 'A1:D2',
          C1: { t: 's', v: 'MSNV' },
          C2: { t: 's', v: 'NV001' },
          D2: { t: 's', v: 'Nguyễn Văn A' },
        },
      },
    } as XLSX.WorkBook
    jest.spyOn(XLSX, 'read').mockReturnValue(workbook)

    const result = await service.uploadPeriod(Buffer.from('test'), 6, 2026, 99, 'salary.xlsx')

    expect(result.totalRows).toBe(1)
    expect(mockPrisma.salaryPeriod.update).toHaveBeenCalledTimes(1)
    expect(mockPrisma.salaryPeriod.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 11 },
      data: expect.objectContaining({ deletedAt: null }),
    }))
  })
})
