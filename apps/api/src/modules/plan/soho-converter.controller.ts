import {
  BadRequestException,
  Body,
  Controller,
  Header,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { Roles } from '../../common/decorators/roles.decorator'
import { SohoConverterService } from './soho-converter.service'

const ALLOWED_EXCEL = /\.(xlsx|xls)$/i

@ApiTags('plan')
@ApiBearerAuth()
@Controller('plan/soho-converter')
@Roles('ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER')
export class SohoConverterController {
  constructor(private readonly service: SohoConverterService) {}

@ApiBearerAuth()
@Controller('plan/soho-converter')
@Roles('ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER')
export class SohoConverterController {
  constructor(private readonly service: SohoConverterService) {}

  @Post('convert')
  @ApiOperation({ summary: 'Chuyển đổi file SOHO sang báo cáo Daily Production Report' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        factoryName: { type: 'string' },
      },
      required: ['file', 'factoryName'],
    },
  })
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="soho-output.xlsx"')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_EXCEL.test(file.originalname)) {
          cb(new BadRequestException('Chỉ chấp nhận file Excel (.xlsx, .xls)'), false)
          return
        }
        cb(null, true)
      },
    }),
  )
  async convert(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Không có file được tải lên')
    }

    const factoryName = req.body?.factoryName
    if (!factoryName || typeof factoryName !== 'string' || !factoryName.trim()) {
      throw new BadRequestException('Vui lòng nhập tên xưởng')
    }

    const result = await this.service.convert(file.buffer, factoryName.trim())
    return new StreamableFile(result)
  }
}
