import { Controller, Get, Patch, Body } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { CompanyService } from './company.service'
import { UpdateCompanyDto } from './dto/company.dto'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('company')
@ApiBearerAuth()
@Controller('company')
export class CompanyController {
  constructor(private companyService: CompanyService) {}

  @Get()
  @ApiOperation({ summary: 'Thông tin công ty' })
  findOne() {
    return this.companyService.findOne()
  }

  @Patch()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cập nhật thông tin công ty (ADMIN)' })
  update(@Body() dto: UpdateCompanyDto) {
    return this.companyService.update(dto)
  }
}
