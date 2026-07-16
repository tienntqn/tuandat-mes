import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AccountingService } from './accounting.service'
import { UploadSalaryPeriodDto } from './dto/upload-salary-period.dto'
import { SendSalaryDto } from './dto/send-salary.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

const ALLOWED_EXCEL = /\.(xlsx|xls)$/i

@ApiTags('accounting')
@ApiBearerAuth()
@Controller('accounting/salary-periods')
@Roles('ADMIN', 'BOD', 'ACCOUNTANT')
export class AccountingController {
  constructor(private accountingService: AccountingService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách kỳ lương' })
  listPeriods() {
    return this.accountingService.listPeriods()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết kỳ lương (kèm danh sách nhân viên)' })
  getPeriod(@Param('id', ParseIntPipe) id: number) {
    return this.accountingService.getPeriod(id)
  }

  @Post('upload')
  @Roles('ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Upload file Excel bảng lương (cột B..AH + AP email)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_EXCEL.test(file.originalname)) {
          cb(new BadRequestException('Chỉ chấp nhận file Excel (.xlsx, .xls)'), false)
          return
        }
        cb(null, true)
      },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadSalaryPeriodDto,
    @CurrentUser() user: RequestUser,
  ) {
    if (!file) throw new BadRequestException('Không có file được tải lên')
    return this.accountingService.uploadPeriod(
      file.buffer,
      dto.month,
      dto.year,
      user.id,
      file.originalname,
    )
  }

  @Post(':id/send')
  @Roles('ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Gửi email bảng lương cho nhân viên trong kỳ' })
  sendEmails(@Param('id', ParseIntPipe) id: number, @Body() dto: SendSalaryDto) {
    return this.accountingService.sendEmails(id, dto)
  }

  @Delete(':id')
  @Roles('ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Xoá kỳ lương (soft delete)' })
  deletePeriod(@Param('id', ParseIntPipe) id: number) {
    return this.accountingService.deletePeriod(id)
  }
}
