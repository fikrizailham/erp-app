import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('pos')
@Controller('pos')
export class SalesController {
  constructor(private service: SalesService) {}

  @Get('products/search')
  searchProducts(@Query('q') q: string) {
    return this.service.searchProducts(q ?? '');
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER)
  @Post('sales')
  createSale(@Body() dto: CreateSaleDto) {
    return this.service.createSale(dto);
  }

  @Get('sales')
  findAll(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('channel') channel?: string,
  ) {
    return this.service.findAll({ from, to, channel });
  }

  @Get('sales/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get('sales/:id/receipt')
  getReceipt(@Param('id') id: string) {
    return this.service.getReceipt(id);
  }
}
