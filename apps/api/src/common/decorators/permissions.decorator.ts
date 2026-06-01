import { SetMetadata } from '@nestjs/common'

export const PERMISSIONS_KEY = 'permissions'

// Cú pháp: @RequirePermissions('factory:READ', 'factory:UPDATE')
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions)
