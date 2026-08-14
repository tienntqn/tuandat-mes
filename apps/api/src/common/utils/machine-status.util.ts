import { Prisma, MachineStatus } from '@prisma/client'

/** Client Prisma dùng được cả ngoài lẫn trong transaction. */
type PrismaLike = Prisma.TransactionClient

/**
 * Đổi trạng thái máy và ghi nhật ký lý lịch.
 * Mọi thay đổi trạng thái máy phát sinh từ nghiệp vụ (báo hỏng, sửa chữa,
 * bảo dưỡng, bàn giao, điều chuyển, thanh lý) đều phải đi qua hàm này
 * để màn hình "Lý lịch máy" phản ánh đúng lịch sử.
 */
export async function changeMachineStatus(
  prisma: PrismaLike,
  machineId: number,
  toStatus: MachineStatus,
  opts: { reason?: string; refType?: string; refId?: number; changedBy?: number } = {},
) {
  const machine = await prisma.machine.findUnique({
    where: { id: machineId },
    select: { status: true },
  })
  if (!machine) return null

  // Không ghi log nếu trạng thái không đổi
  if (machine.status === toStatus) return machine

  await prisma.machine.update({ where: { id: machineId }, data: { status: toStatus } })
  await prisma.machineStatusLog.create({
    data: {
      machineId,
      fromStatus: machine.status,
      toStatus,
      reason: opts.reason ?? null,
      refType: opts.refType ?? null,
      refId: opts.refId ?? null,
      changedBy: opts.changedBy ?? null,
    },
  })
  return machine
}
