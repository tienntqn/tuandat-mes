import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateTransferDto, RejectTransferDto } from './dto/transfer.dto'
import type { RequestUser } from '../../common/types/request-user.type'

@Injectable()
export class MachineTransferService {
  constructor(private prisma: PrismaService) {}

  // Dữ liệu cho form tạo lệnh điều chuyển: tất cả xưởng + người (GĐ xưởng/Cơ điện) theo xưởng
  async getFormOptions() {
    const [factories, people] = await Promise.all([
      this.prisma.factory.findMany({
        where: { deletedAt: null },
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.employee.findMany({
        where: {
          deletedAt: null,
          factoryId: { not: null },
          position: { in: ['FACTORY_DIRECTOR', 'MECHANIC'] },
        },
        select: { id: true, fullName: true, position: true, factoryId: true },
        orderBy: { fullName: 'asc' },
      }),
    ])
    return { factories, people }
  }

  async findAll(
    user: RequestUser,
    machineId?: number,
    status?: string,
    page = 1,
    pageSize = 20,
  ) {
    const where: any = {}

    // MECHANIC/FACTORY_DIRECTOR chỉ thấy lệnh của xưởng mình.
    // Xưởng NHẬN chỉ thấy lệnh SAU KHI đã được BOD/Admin duyệt (không thấy lệnh còn PENDING).
    if (user.dataScope.type === 'FACTORY') {
      where.OR = [
        { fromFactoryId: user.dataScope.factoryId },
        { toFactoryId: user.dataScope.factoryId, status: { not: 'PENDING' } },
      ]
    }

    if (machineId) where.machineId = machineId
    if (status) where.status = status

    const skip = (page - 1) * pageSize
    const [data, total] = await Promise.all([
      this.prisma.machineTransfer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { transferDate: 'desc' },
        include: {
          machine: { select: { id: true, code: true, name: true, type: true } },
          fromFactory: { select: { id: true, name: true } },
          toFactory: { select: { id: true, name: true } },
          sender: { select: { id: true, fullName: true } },
          receiver: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.machineTransfer.count({ where }),
    ])

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: number) {
    const transfer = await this.prisma.machineTransfer.findUnique({
      where: { id },
      include: {
        machine: { select: { id: true, code: true, name: true, type: true, status: true } },
        fromFactory: { select: { id: true, name: true } },
        toFactory: { select: { id: true, name: true } },
        sender: { select: { id: true, fullName: true } },
        receiver: { select: { id: true, fullName: true } },
      },
    })
    if (!transfer) throw new NotFoundException('Lệnh điều chuyển không tồn tại')
    return transfer
  }

  // Tự sinh số lệnh chuyển theo xưởng nguồn: {code}_LC_001, {code}_LC_002, ...
  private async generateTransferOrderNo(factoryCode: string): Promise<string> {
    const prefix = `${factoryCode}_LC_`
    // Đếm các lệnh đã có cùng tiền tố để lấy số kế tiếp; lặp để đảm bảo không trùng
    let seq =
      (await this.prisma.machineTransfer.count({
        where: { transferOrderNo: { startsWith: prefix } },
      })) + 1
    let code = `${prefix}${String(seq).padStart(3, '0')}`
    while (await this.prisma.machineTransfer.findUnique({ where: { transferOrderNo: code } })) {
      seq++
      code = `${prefix}${String(seq).padStart(3, '0')}`
    }
    return code
  }

  async create(dto: CreateTransferDto) {
    // Kiểm tra máy tồn tại và đang ở xưởng nguồn
    const machine = await this.prisma.machine.findFirst({ where: { id: dto.machineId, deletedAt: null } })
    if (!machine) throw new NotFoundException('Máy không tồn tại')
    if (machine.factoryId !== dto.fromFactoryId) {
      throw new BadRequestException('Máy không thuộc xưởng nguồn')
    }

    // Không cho tạo lệnh chuyển khi máy đang có lệnh PENDING hoặc SENDER_CONFIRMED
    const pendingTransfer = await this.prisma.machineTransfer.findFirst({
      where: {
        machineId: dto.machineId,
        status: { in: ['PENDING', 'SENDER_CONFIRMED'] },
      },
    })
    if (pendingTransfer) throw new BadRequestException('Máy đang có lệnh điều chuyển chưa hoàn thành')

    // Kiểm tra xưởng nguồn và đích tồn tại
    const [fromFactory, toFactory] = await Promise.all([
      this.prisma.factory.findFirst({ where: { id: dto.fromFactoryId, deletedAt: null } }),
      this.prisma.factory.findFirst({ where: { id: dto.toFactoryId, deletedAt: null } }),
    ])
    if (!fromFactory) throw new NotFoundException('Xưởng nguồn không tồn tại')
    if (!toFactory) throw new NotFoundException('Xưởng đích không tồn tại')
    if (dto.fromFactoryId === dto.toFactoryId) throw new BadRequestException('Xưởng nguồn và đích không được trùng nhau')

    // Số lệnh chuyển: dùng giá trị nhập hoặc tự sinh theo định dạng {MãXưởngNguồn}_LC_XXX (vd X2_LC_001)
    const transferOrderNo =
      dto.transferOrderNo?.trim() || (await this.generateTransferOrderNo(fromFactory.code))

    // Kiểm tra sender/receiver tồn tại
    const [sender, receiver] = await Promise.all([
      this.prisma.employee.findFirst({ where: { id: dto.senderId, deletedAt: null } }),
      this.prisma.employee.findFirst({ where: { id: dto.receiverId, deletedAt: null } }),
    ])
    if (!sender) throw new NotFoundException('Người gửi không tồn tại')
    if (!receiver) throw new NotFoundException('Người nhận không tồn tại')

    return this.prisma.machineTransfer.create({
      data: {
        machineId: dto.machineId,
        transferOrderNo,
        transferDate: new Date(dto.transferDate),
        reason: dto.reason,
        fromFactoryId: dto.fromFactoryId,
        toFactoryId: dto.toFactoryId,
        senderId: dto.senderId,
        receiverId: dto.receiverId,
        status: 'PENDING',
      },
      include: {
        machine: { select: { id: true, code: true, name: true } },
        fromFactory: { select: { id: true, name: true } },
        toFactory: { select: { id: true, name: true } },
        sender: { select: { id: true, fullName: true } },
        receiver: { select: { id: true, fullName: true } },
      },
    })
  }

  // Bước 2: BOD/Admin DUYỆT lệnh (chỉ duyệt, không thay bên đưa/nhận xác nhận)
  async confirmSender(id: number, _user: RequestUser) {
    const transfer = await this.findOne(id)

    if (transfer.status !== 'PENDING') {
      throw new BadRequestException('Lệnh chuyển không ở trạng thái chờ duyệt')
    }

    return this.prisma.machineTransfer.update({
      where: { id },
      data: { status: 'SENDER_CONFIRMED', senderConfirmedAt: new Date() },
      include: {
        machine: { select: { id: true, code: true, name: true } },
        fromFactory: { select: { id: true, name: true } },
        toFactory: { select: { id: true, name: true } },
      },
    })
  }

  // Bước 3: Bên NHẬN xác nhận → máy đổi factoryId, gỡ lineId
  async confirmReceiver(id: number, user: RequestUser) {
    const transfer = await this.findOne(id)

    if (transfer.status !== 'SENDER_CONFIRMED') {
      throw new BadRequestException('Lệnh chuyển chưa được bên đưa xác nhận')
    }

    // CHỈ đúng người nhận được chỉ định trong lệnh mới được xác nhận đã nhận (kể cả Admin/BOD cũng không thay được)
    if (user.employeeId !== transfer.receiverId) {
      throw new ForbiddenException('Chỉ người nhận trong lệnh chuyển mới được xác nhận đã nhận máy')
    }

    // Transaction: cập nhật lệnh + cập nhật máy
    const [updatedTransfer] = await this.prisma.$transaction([
      this.prisma.machineTransfer.update({
        where: { id },
        data: { status: 'COMPLETED', receiverConfirmedAt: new Date() },
        include: {
          machine: { select: { id: true, code: true, name: true } },
          fromFactory: { select: { id: true, name: true } },
          toFactory: { select: { id: true, name: true } },
        },
      }),
      // Máy chuyển sang xưởng mới, gỡ chuyền cũ
      this.prisma.machine.update({
        where: { id: transfer.machineId },
        data: { factoryId: transfer.toFactoryId, lineId: null },
      }),
    ])

    return updatedTransfer
  }

  // Từ chối / hủy lệnh:
  //  - Khi PENDING (chờ duyệt): chỉ BOD/Admin được từ chối.
  //  - Khi SENDER_CONFIRMED (đã duyệt, chờ nhận): chỉ ĐÚNG người nhận trong lệnh (hoặc Admin) được từ chối nhận.
  async reject(id: number, dto: RejectTransferDto, user: RequestUser) {
    const transfer = await this.findOne(id)

    if (transfer.status === 'COMPLETED' || transfer.status === 'REJECTED') {
      throw new BadRequestException('Lệnh chuyển đã hoàn thành hoặc đã bị từ chối')
    }

    const isAdmin = user.roles.includes('ADMIN')
    if (transfer.status === 'PENDING') {
      if (!isAdmin && !user.roles.includes('BOD')) {
        throw new ForbiddenException('Chỉ BOD/Admin được từ chối lệnh khi chờ duyệt')
      }
    } else if (transfer.status === 'SENDER_CONFIRMED') {
      if (!isAdmin && user.employeeId !== transfer.receiverId) {
        throw new ForbiddenException('Chỉ người nhận trong lệnh mới được từ chối nhận máy')
      }
    }

    return this.prisma.machineTransfer.update({
      where: { id },
      data: { status: 'REJECTED', rejectReason: dto.rejectReason },
      include: {
        machine: { select: { id: true, code: true, name: true } },
        fromFactory: { select: { id: true, name: true } },
        toFactory: { select: { id: true, name: true } },
      },
    })
  }

  // Timeline lịch sử điều chuyển của 1 máy
  async getMachineHistory(machineId: number) {
    const machine = await this.prisma.machine.findFirst({ where: { id: machineId, deletedAt: null } })
    if (!machine) throw new NotFoundException('Máy không tồn tại')

    return this.prisma.machineTransfer.findMany({
      where: { machineId },
      orderBy: { transferDate: 'desc' },
      include: {
        fromFactory: { select: { id: true, name: true } },
        toFactory: { select: { id: true, name: true } },
        sender: { select: { id: true, fullName: true } },
        receiver: { select: { id: true, fullName: true } },
      },
    })
  }
}
