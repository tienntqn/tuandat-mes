import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { OutputService } from './output.service'
import { PrismaService } from '../prisma/prisma.service'
import type { RequestUser } from '../../common/types/request-user.type'

// Mock đơn giản — kiểm tra logic nghiệp vụ, không cần DB thật
const mockPrisma = {
  dailyOutput: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    findMany: jest.fn(),
  },
  dailyOutputLog: { create: jest.fn(), findMany: jest.fn() },
  styleLine: { findMany: jest.fn() },
  productionLine: { findUnique: jest.fn() },
  factoryPlan: { findMany: jest.fn() },
}

const mockConfig = { get: jest.fn().mockReturnValue('19') }

function makeUser(lineId: number | null = 1): RequestUser {
  return {
    sub: 1,
    username: 'test',
    employeeId: 10,
    position: 'LINE_LEADER',
    factoryId: null,
    lineId,
    dataScope: lineId ? { type: 'LINE', lineId } : { type: 'COMPANY' },
    roles: [],
  } as unknown as RequestUser
}

describe('OutputService — upsert sản lượng', () => {
  let service: OutputService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OutputService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile()
    service = module.get(OutputService)
    jest.clearAllMocks()
  })

  it('ném ForbiddenException nếu user chưa gán chuyền', async () => {
    const user = makeUser(null)
    await expect(
      service.upsertOutput(user, { lineId: 1, styleId: 1, stage: 'SEWING', quantity: 100, outputDate: new Date() }),
    ).rejects.toThrow(ForbiddenException)
  })

  it('ném ForbiddenException nếu lineId của DTO khác lineId của user', async () => {
    const user = makeUser(1)
    await expect(
      service.upsertOutput(user, { lineId: 99, styleId: 1, stage: 'SEWING', quantity: 100, outputDate: new Date() }),
    ).rejects.toThrow(ForbiddenException)
  })

  it('ném BadRequestException nếu đã qua cutoff time hôm nay', async () => {
    // Mock cutoff = 0 → luôn đã qua
    mockConfig.get.mockReturnValueOnce('0')
    const user = makeUser(1)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    await expect(
      service.upsertOutput(user, { lineId: 1, styleId: 1, stage: 'SEWING', quantity: 100, outputDate: today }),
    ).rejects.toThrow(BadRequestException)
  })

  it('ném BadRequestException nếu nhập sản lượng cho ngày trong quá khứ', async () => {
    const user = makeUser(1)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    await expect(
      service.upsertOutput(user, { lineId: 1, styleId: 1, stage: 'SEWING', quantity: 100, outputDate: yesterday }),
    ).rejects.toThrow(BadRequestException)
  })

  it('gọi upsert (ghi đè) và tạo audit log khi hợp lệ', async () => {
    // Đặt cutoff = 23 → chưa qua
    mockConfig.get.mockReturnValue('23')
    const user = makeUser(1)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const fakeOutput = { id: 5, lineId: 1, styleId: 1, stage: 'SEWING', quantity: 100, outputDate: today }
    mockPrisma.dailyOutput.upsert.mockResolvedValue(fakeOutput)
    mockPrisma.dailyOutputLog.create.mockResolvedValue({})
    mockPrisma.dailyOutput.findUnique.mockResolvedValue(fakeOutput)

    const dto = { lineId: 1, styleId: 1, stage: 'SEWING' as const, quantity: 100, outputDate: today }
    await service.upsertOutput(user, dto)

    // Phải gọi upsert (không phải create hay update riêng)
    expect(mockPrisma.dailyOutput.upsert).toHaveBeenCalledTimes(1)
    // Phải tạo audit log
    expect(mockPrisma.dailyOutputLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quantity: 100, enteredBy: user.employeeId }) }),
    )
  })
})
