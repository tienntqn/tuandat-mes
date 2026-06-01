import { IsString, MinLength, MaxLength } from 'class-validator'

export class ChangePasswordDto {
  @IsString()
  oldPassword: string

  @IsString()
  @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
  @MaxLength(100)
  newPassword: string
}
