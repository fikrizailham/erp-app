import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DeliveryStatus } from '@prisma/client';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('delivery')
@Controller('delivery')
export class DeliveryController {
  constructor(private service: DeliveryService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES)
  @Post()
  create(@Body() dto: CreateDeliveryDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.DRIVER)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: DeliveryStatus) {
    return this.service.updateStatus(id, status);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('vehicles')
  createVehicle(@Body('plateNumber') plateNumber: string, @Body('type') type?: string) {
    return this.service.createVehicle(plateNumber, type);
  }

  @Get('vehicles')
  findVehicles() {
    return this.service.findVehicles();
  }
}
