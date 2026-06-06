import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { PayrollService } from './payroll.service'
import { Roles } from '../../common/decorators/roles.decorator'
import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('payroll')
@ApiBearerAuth()
@Controller('payroll')
@Roles('ADMIN', 'BOD', 'COMPANY_PLANNER', 'FACTORY_DIRECTOR', 'FACTORY_PLANNER')
@RequirePermissions('payroll:READ')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  // Lương theo chuyền may
  @Get('lines')
  @ApiOperation({ summary: 'Lương bình quân theo chuyền may' })
  @ApiQuery({ name: 'factoryId', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, description: 'YYYY-MM (mặc định tháng hiện tại)' })
  getLines(
    @CurrentUser() user: RequestUser,
    @Query('factoryId') factoryId?: string,
    @Query('month') month?: string,
  ) {
    return this.payrollService.getLinePayroll(
      user,
      factoryId ? parseInt(factoryId, 10) : undefined,
      month,
    )
  }

  // Lương theo tổ Cắt / Hoàn thành (cấp xưởng)
  @Get('sections')
  @ApiOperation({ summary: 'Lương bình quân tổ Cắt / Hoàn thành' })
  @ApiQuery({ name: 'factoryId', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, description: 'YYYY-MM (mặc định tháng hiện tại)' })
  getSections(
    @CurrentUser() user: RequestUser,
    @Query('factoryId') factoryId?: string,
    @Query('month') month?: string,
  ) {
    return this.payrollService.getSectionPayroll(
      user,
      factoryId ? parseInt(factoryId, 10) : undefined,
      month,
    )
  }
}
