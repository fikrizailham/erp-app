import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PurchasingService } from './purchasing.service';
import {
  CreateGoodsReceiptDto,
  CreatePurchaseOrderDto,
  CreatePurchaseRequestDto,
} from './dto/purchasing.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('purchasing')
@Controller('purchasing')
export class PurchasingController {
  constructor(private service: PurchasingService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE_STAFF)
  @Post('requests')
  createRequest(@Body() dto: CreatePurchaseRequestDto) {
    return this.service.createPurchaseRequest(dto);
  }

  @Get('requests')
  findRequests(@Query('status') status?: string) {
    return this.service.findPurchaseRequests(status);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch('requests/:id/approve')
  approveRequest(@Param('id') id: string) {
    return this.service.approvePurchaseRequest(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('orders')
  createOrder(@Body() dto: CreatePurchaseOrderDto) {
    return this.service.createPurchaseOrder(dto);
  }

  @Get('orders')
  findOrders(@Query('status') status?: string) {
    return this.service.findPurchaseOrders(status);
  }

  @Get('orders/:id')
  findOrder(@Param('id') id: string) {
    return this.service.findPurchaseOrder(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE_STAFF)
  @Post('goods-receipts')
  receiveGoods(@Body() dto: CreateGoodsReceiptDto) {
    return this.service.receiveGoods(dto);
  }
}
