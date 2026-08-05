import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { AdjustStockDto, TransferStockDto } from './dto/transfer-stock.dto';
import { CreateStockOpnameDto } from './dto/stock-opname.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private service: InventoryService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('warehouses')
  createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.service.createWarehouse(dto);
  }

  @Get('warehouses')
  findWarehouses(@Query('type') type?: string) {
    return this.service.findWarehouses(type);
  }

  @Get('stock/raw-materials')
  rawMaterialStock(@Query('warehouseId') warehouseId?: string) {
    return this.service.rawMaterialStock(warehouseId);
  }

  @Get('stock/finished-goods')
  finishedGoodsStock(@Query('warehouseId') warehouseId?: string) {
    return this.service.finishedGoodsStock(warehouseId);
  }

  @Get('expiry-alerts')
  expiryAlerts() {
    return this.service.expiryAlerts();
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE_STAFF)
  @Post('transfer')
  transfer(@Body() dto: TransferStockDto) {
    return this.service.transferStock(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE_STAFF)
  @Post('adjust')
  adjust(@Body() dto: AdjustStockDto) {
    return this.service.adjustStock(dto);
  }

  @Get('batches/:batchId/trace')
  traceBatch(@Param('batchId') batchId: string) {
    return this.service.traceBatch(batchId);
  }

  @Get('customers/:customerId/trace')
  traceCustomer(@Param('customerId') customerId: string) {
    return this.service.traceCustomer(customerId);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE_STAFF)
  @Post('opname')
  createOpname(@Body() dto: CreateStockOpnameDto) {
    return this.service.createStockOpname(dto);
  }

  @Get('opname')
  findOpnames(@Query('warehouseId') warehouseId?: string) {
    return this.service.findOpnames(warehouseId);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE_STAFF)
  @Post('opname/:id/complete')
  completeOpname(@Param('id') id: string) {
    return this.service.completeStockOpname(id);
  }
}
