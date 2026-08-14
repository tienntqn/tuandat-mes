import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { MachineRecordService } from './machine-record.service'
import {
  CreateCertificateDto,
  UpdateCertificateDto,
  CreateMachineDocumentDto,
  UpdateMachineDocumentDto,
} from './dto/machine-record.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('machine-certificates')
@ApiBearerAuth()
@Controller('machine-certificates')
export class MachineCertificateController {
  constructor(private service: MachineRecordService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách chứng chỉ / kiểm định' })
  @ApiQuery({ name: 'machineId', required: false, type: Number })
  @ApiQuery({ name: 'expiringInDays', required: false, type: Number, description: 'Lọc chứng chỉ sắp hết hạn' })
  findAll(
    @CurrentUser() user: RequestUser,
    @Query('machineId', new ParseIntPipe({ optional: true })) machineId?: number,
    @Query('expiringInDays', new ParseIntPipe({ optional: true })) expiringInDays?: number,
  ) {
    return this.service.findCertificates(user, machineId, expiringInDays)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết chứng chỉ' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findCertificate(id)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Thêm chứng chỉ / kiểm định cho máy' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCertificateDto) {
    return this.service.createCertificate(user, dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Cập nhật chứng chỉ' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateCertificateDto,
  ) {
    return this.service.updateCertificate(id, user, dto)
  }

  @Delete(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR')
  @ApiOperation({ summary: 'Xóa chứng chỉ' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.removeCertificate(id, user)
  }
}

@ApiTags('machine-documents')
@ApiBearerAuth()
@Controller('machine-documents')
export class MachineDocumentController {
  constructor(private service: MachineRecordService) {}

  @Get()
  @ApiOperation({ summary: 'Tài liệu đính kèm của một máy' })
  @ApiQuery({ name: 'machineId', required: true, type: Number })
  @ApiQuery({ name: 'type', required: false })
  findAll(
    @Query('machineId', ParseIntPipe) machineId: number,
    @Query('type') type?: string,
  ) {
    return this.service.findDocuments(machineId, type)
  }

  @Post()
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Thêm tài liệu vào hồ sơ máy' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateMachineDocumentDto) {
    return this.service.createDocument(user, dto)
  }

  @Patch(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Cập nhật tài liệu' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateMachineDocumentDto,
  ) {
    return this.service.updateDocument(id, user, dto)
  }

  @Delete(':id')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Xóa tài liệu' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    return this.service.removeDocument(id, user)
  }
}
