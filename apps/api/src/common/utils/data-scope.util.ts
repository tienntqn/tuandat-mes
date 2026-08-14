import { ForbiddenException } from '@nestjs/common'
import type { RequestUser } from '../types/request-user.type'

/**
 * Áp data scope cho các nghiệp vụ máy móc.
 * - COMPANY: xem toàn công ty
 * - FACTORY (GĐ xưởng / KH xưởng / cơ điện): chỉ xưởng mình
 * - LINE (tổ trưởng/tổ phó): không có quyền với dữ liệu máy móc
 *
 * Trả về `null` nghĩa là người dùng không được xem gì — service trả danh sách rỗng.
 */
export function factoryScopeFilter(user: RequestUser, factoryId?: number): { factoryId?: number } | null {
  if (user.dataScope.type === 'LINE') return null
  if (user.dataScope.type === 'FACTORY') {
    // Người dùng cấp xưởng bị khóa cứng vào xưởng của mình, bỏ qua tham số lọc
    return { factoryId: user.dataScope.factoryId }
  }
  return factoryId ? { factoryId } : {}
}

/** Chặn thao tác ghi lên dữ liệu không thuộc xưởng của người dùng cấp xưởng. */
export function assertFactoryAccess(user: RequestUser, factoryId: number, message = 'Dữ liệu không thuộc xưởng của bạn') {
  if (user.dataScope.type === 'FACTORY' && user.dataScope.factoryId !== factoryId) {
    throw new ForbiddenException(message)
  }
  if (user.dataScope.type === 'LINE') {
    throw new ForbiddenException('Bạn không có quyền thao tác với dữ liệu máy móc')
  }
}

/** Người dùng có quyền duyệt ở cấp công ty hay không (bước duyệt thứ 2). */
export function isCompanyLevel(user: RequestUser): boolean {
  return user.dataScope.type === 'COMPANY'
}
