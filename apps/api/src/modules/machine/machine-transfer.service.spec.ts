import { Test } from '@nestjs/testing'
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { MachineTransferService } from './machine-transfer.service'
import { PrismaService } from '../prisma/prisma.service'
import type { RequestUser } from '../../common/types/request-user.type'

const mockTransferPending = {
  id: 1,
  machineId: 10,
  status: 'PENDING',
  fromFactoryId: 1,
  toFactoryId: 2,
  senderId: 5,
  receiverId: 6,
}

const mockTransferSenderConfirmed = { ...mockTransferPending, status: 'SENDER_CONFIRMED' }
const mockTransferCompleted = { ...mockTransferPending, status: 'COMPLETED' }

const mockPrisma = {
  machineTransfer: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  machine: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  employee: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
}

function makeFactoryUser(factoryId: number): RequestUser {
  return {
    sub: 1,
    username: 'manager',
    employeeId: 5,
    position: 'FACTORY_DIRECTOR',
    factoryId,
    lineId: null,
    dataScope: { type: 'FACTORY', factoryId },
    roles: [],
  } as unknown as RequestUser
}

describe('MachineTransferService — workflow 2 bước xác nhận', () => {
  let service: MachineTransferService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MachineTransferService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get(MachineTransferService)
    jest.clearAllMocks()
  })

  // --- confirmSender ---
  it('confirmSender: ném BadRequestException nếu không ở PENDING', async () => {
    mockPrisma.machineTransfer.findFirst.mockResolvedValue(mockTransferSenderConfirmed)
    await expect(service.confirmSender(1, makeFactoryUser(1))).rejects.toThrow(BadRequestException)
  })

  it('confirmSender: ném ForbiddenException nếu user không thuộc xưởng bên đưa', async () => {
    mockPrisma.machineTransfer.findFirst.mockResolvedValue(mockTransferPending)
    // User thuộc factory 2, nhưng fromFactoryId = 1
    await expect(service.confirmSender(1, makeFactoryUser(2))).rejects.toThrow(ForbiddenException)
  })

  it('confirmSender: cập nhật status SENDER_CONFIRMED khi hợp lệ', async () => {
    mockPrisma.machineTransfer.findFirst.mockResolvedValue(mockTransferPending)
    mockPrisma.machineTransfer.update.mockResolvedValue({ ...mockTransferPending, status: 'SENDER_CONFIRMED' })

    const result = await service.confirmSender(1, makeFactoryUser(1))
    expect(mockPrisma.machineTransfer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ status: 'SENDER_CONFIRMED' }),
      }),
    )
    expect(result.status).toBe('SENDER_CONFIRMED')
  })

  // --- confirmReceiver ---
  it('confirmReceiver: ném BadRequestException nếu không ở SENDER_CONFIRMED', async () => {
    mockPrisma.machineTransfer.findFirst.mockResolvedValue(mockTransferPending)
    await expect(service.confirmReceiver(1, makeFactoryUser(2))).rejects.toThrow(BadRequestException)
  })

  it('confirmReceiver: ném ForbiddenException nếu user không thuộc xưởng bên nhận', async () => {
    mockPrisma.machineTransfer.findFirst.mockResolvedValue(mockTransferSenderConfirmed)
    // User thuộc factory 1, nhưng toFactoryId = 2
    await expect(service.confirmReceiver(1, makeFactoryUser(1))).rejects.toThrow(ForbiddenException)
  })

  it('confirmReceiver: thực hiện transaction COMPLETED + đổi factoryId máy + xóa lineId', async () => {
    mockPrisma.machineTransfer.findFirst.mockResolvedValue(mockTransferSenderConfirmed)
    const completedTransfer = { ...mockTransferSenderConfirmed, status: 'COMPLETED' }
    mockPrisma.$transaction.mockResolvedValue([completedTransfer, {}])

    const result = await service.confirmReceiver(1, makeFactoryUser(2))

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    const txArgs = mockPrisma.$transaction.mock.calls[0][0]
    // Transaction phải có 2 operations
    expect(txArgs).toHaveLength(2)
  })

  // --- reject ---
  it('reject: ném BadRequestException nếu đã COMPLETED', async () => {
    mockPrisma.machineTransfer.findFirst.mockResolvedValue(mockTransferCompleted)
    await expect(service.reject(1, { rejectReason: 'test' }, makeFactoryUser(1))).rejects.toThrow(BadRequestException)
  })

  it('reject: cập nhật status REJECTED + lưu lý do', async () => {
    mockPrisma.machineTransfer.findFirst.mockResolvedValue(mockTransferPending)
    mockPrisma.machineTransfer.update.mockResolvedValue({ ...mockTransferPending, status: 'REJECTED', rejectReason: 'Máy hỏng' })

    await service.reject(1, { rejectReason: 'Máy hỏng' }, makeFactoryUser(1))
    expect(mockPrisma.machineTransfer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'REJECTED', rejectReason: 'Máy hỏng' }) }),
    )
  })
})
