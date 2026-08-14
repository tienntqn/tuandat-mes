import { Controller, Get, Post, Body, Query, ParseIntPipe, ParseBoolPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger'
import { StockService } from './stock.service'
import { ReceiveStockDto, AdjustStockDto, SetMinQuantityDto } from './dto/stock.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { assertFactoryAccess } from '../../common/utils/data-scope.util'
import type { RequestUser } from '../../common/types/request-user.type'

@ApiTags('spare-part-stocks')
@ApiBearerAuth()
@Controller('spare-part-stocks')
export class StockController {
  constructor(private service: StockService) {}

  @Get()
  @ApiOperation({ summary: 'Tồn kho phụ tùng theo xưởng' })
  @ApiQuery({ name: 'factoryId', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'belowMin', required: false, type: Boolean, description: 'Chỉ lấy phụ tùng dưới định mức tồn' })
  findStocks(
    @CurrentUser() user: RequestUser,
    @Query('factoryId', new ParseIntPipe({ optional: true })) factoryId?: number,
    @Query('search') search?: string,
    @Query('belowMin', new ParseBoolPipe({ optional: true })) belowMin?: boolean,
  ) {
    return this.service.findStocks(user, factoryId, search, belowMin)
  }

  @Get('movements')
  @ApiOperation({ summary: 'Thẻ kho — lịch sử nhập/xuất/kiểm kê' })
  @ApiQuery({ name: 'sparePartId', required: false, type: Number })
  @ApiQuery({ name: 'factoryId', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, description: 'IN | OUT | ADJUST' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  findMovements(
    @CurrentUser() user: RequestUser,
    @Query('sparePartId', new ParseIntPipe({ optional: true })) sparePartId?: number,
    @Query('factoryId', new ParseIntPipe({ optional: true })) factoryId?: number,
    @Query('type') type?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.service.findMovements(user, sparePartId, factoryId, type, page, pageSize)
  }

  @Post('receive')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Nhập kho phụ tùng' })
  receive(@CurrentUser() user: RequestUser, @Body() dto: ReceiveStockDto) {
    assertFactoryAccess(user, dto.factoryId)
    return this.service.receive(user, {
      ...dto,
      movementDate: dto.movementDate ? new Date(dto.movementDate) : undefined,
      reason: 'Nhập kho',
    })
  }

  @Post('adjust')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Điều chỉnh tồn kho sau kiểm kê' })
  adjust(@CurrentUser() user: RequestUser, @Body() dto: AdjustStockDto) {
    assertFactoryAccess(user, dto.factoryId)
    return this.service.adjust(user, dto)
  }

  @Post('min-quantity')
  @Roles('ADMIN', 'BOD', 'FACTORY_DIRECTOR', 'MECHANIC')
  @ApiOperation({ summary: 'Đặt định mức tồn tối thiểu' })
  setMin(@CurrentUser() user: RequestUser, @Body() dto: SetMinQuantityDto) {
    assertFactoryAccess(user, dto.factoryId)
    return this.service.setMinQuantity(dto.sparePartId, dto.factoryId, dto.minQuantity, dto.location)
  }
}
