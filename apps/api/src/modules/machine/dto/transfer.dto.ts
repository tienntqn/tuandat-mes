import { IsString, IsNotEmpty, IsOptional, IsInt, IsDateString } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateTransferDto {
  @ApiProperty()
  @IsInt()
  machineId: number

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Số lệnh chuyển không được để trống' })
  transferOrderNo: string

  @ApiProperty()
  @IsDateString()
  transferDate: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Lý do không được để trống' })
  reason: string

  @ApiProperty()
  @IsInt()
  fromFactoryId: number

  @ApiProperty()
  @IsInt()
  toFactoryId: number

  @ApiProperty({ description: 'employeeId của người bên ĐƯA' })
  @IsInt()
  senderId: number

  @ApiProperty({ description: 'employeeId của người bên NHẬN' })
  @IsInt()
  receiverId: number
}

export class RejectTransferDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
  rejectReason: string
}
