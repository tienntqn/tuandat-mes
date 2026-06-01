import { Test } from '@nestjs/testing'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { CompanyPlanService } from './company-plan.service'
import { PrismaService } from '../prisma/prisma.service'
import type { RequestUser } from '../../common/types/request-user.type'

const mockPrisma = {
  companyPlan: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  purchaseOrder: { findUnique: jest.fn() },
  $transaction: jest.fn(),
}

function makeCompanyUser(): RequestUser {
  return {
    sub: 1,
    username: 'planner',
    employeeId: 1,
    position: 'COMPANY_PLANNER',
    factoryId: null,
    lineId: null,
    dataScope: { type: 'COMPANY' },
    roles: [],
  } as unknown as RequestUser
}

function makeFactoryUser(factoryId = 1): RequestUser {
  return {
    sub: 2,
    username: 'fplanner',
    employeeId: 2,
    position: 'FACTORY_PLANNER',
    factoryId,
    lineId: null,
    dataScope: { type: 'FACTORY', factoryId },
    roles: [],
  } as unknown as RequestUser
}

describe('CompanyPlanService — validate phân bổ kế hoạch cấp 1', () => {
  let service: CompanyPlanService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CompanyPlanService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get(CompanyPlanService)
    jest.clearAllMocks()
  })

  it('ném ForbiddenException nếu user không thuộc cấp công ty', async () => {
    const dto = { styleId: 1, poId: 1, factoryId: 1, plannedQuantity: 100, startDate: '2025-01-01', expectedFinishDate: '2025-03-01' }
    await expect(service.create(makeFactoryUser(), dto)).rejects.toThrow(ForbiddenException)
  })

  it('ném NotFoundException nếu PO không tồn tại', async () => {
    mockPrisma.purchaseOrder.findUnique.mockResolvedValue(null)
    const dto = { styleId: 1, poId: 999, factoryId: 1, plannedQuantity: 100, startDate: '2025-01-01', expectedFinishDate: '2025-03-01' }
    await expect(service.create(makeCompanyUser(), dto)).rejects.toThrow(NotFoundException)
  })

  it('ném BadRequestException nếu tổng phân bổ vượt quá SL PO', async () => {
    // PO tổng 500, đã phân 400, thêm 200 → vượt
    mockPrisma.purchaseOrder.findUnique.mockResolvedValue({ id: 1, totalQuantity: 500 })
    mockPrisma.companyPlan.findMany.mockResolvedValue([{ plannedQuantity: 400 }])

    const dto = { styleId: 1, poId: 1, factoryId: 1, plannedQuantity: 200, startDate: '2025-01-01', expectedFinishDate: '2025-03-01' }
    await expect(service.create(makeCompanyUser(), dto)).rejects.toThrow(BadRequestException)
  })

  it('tạo CompanyPlan thành công khi phân bổ hợp lệ (400 + 100 ≤ 500)', async () => {
    mockPrisma.purchaseOrder.findUnique.mockResolvedValue({ id: 1, totalQuantity: 500 })
    mockPrisma.companyPlan.findMany.mockResolvedValue([{ plannedQuantity: 400 }])

    const fakeResult = { id: 10, styleId: 1, poId: 1, factoryId: 1, plannedQuantity: 100 }
    mockPrisma.companyPlan.create.mockResolvedValue(fakeResult)

    const dto = { styleId: 1, poId: 1, factoryId: 1, plannedQuantity: 100, startDate: '2025-01-01', expectedFinishDate: '2025-03-01' }
    const result = await service.create(makeCompanyUser(), dto)

    expect(mockPrisma.companyPlan.create).toHaveBeenCalledTimes(1)
    expect(result.plannedQuantity).toBe(100)
  })

  it('bulkCreate: ném BadRequestException nếu tổng các kế hoạch vượt PO', async () => {
    mockPrisma.purchaseOrder.findUnique.mockResolvedValue({ id: 1, poNumber: 'PO-001', totalQuantity: 300 })
    // Đã phân 200, thêm 2 plan tổng 200 → 400 > 300
    mockPrisma.companyPlan.findMany.mockResolvedValue([{ plannedQuantity: 200 }])

    const dto = {
      plans: [
        { styleId: 1, poId: 1, factoryId: 1, plannedQuantity: 100, startDate: '2025-01-01', expectedFinishDate: '2025-03-01' },
        { styleId: 1, poId: 1, factoryId: 2, plannedQuantity: 100, startDate: '2025-01-01', expectedFinishDate: '2025-03-01' },
      ],
    }
    await expect(service.bulkCreate(makeCompanyUser(), dto)).rejects.toThrow(BadRequestException)
  })
})
