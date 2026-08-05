import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProductionService } from './production.service';
import {
  CompleteProductionOrderDto,
  CreateProductionOrderDto,
  CreateProductionPlanDto,
} from './dto/production.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('production')
@Controller('production')
export class ProductionController {
  constructor(private service: ProductionService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('plans')
  createPlan(@Body() dto: CreateProductionPlanDto) {
    return this.service.createPlan(dto);
  }

  @Get('plans')
  findPlans() {
    return this.service.findPlans();
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('orders')
  createOrder(@Body() dto: CreateProductionOrderDto) {
    return this.service.createOrder(dto);
  }

  @Get('orders')
  findOrders(@Query('status') status?: string) {
    return this.service.findOrders(status);
  }

  @Get('orders/:id')
  findOrder(@Param('id') id: string) {
    return this.service.findOrder(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PRODUCTION_STAFF)
  @Patch('orders/:id/start')
  start(@Param('id') id: string) {
    return this.service.startProduction(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.PRODUCTION_STAFF)
  @Patch('orders/:id/complete')
  complete(@Param('id') id: string, @Body() dto: CompleteProductionOrderDto) {
    return this.service.completeProduction(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Patch('orders/:id/cancel')
  cancel(@Param('id') id: string) {
    return this.service.cancelOrder(id);
  }
}
