import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private service: SubscriptionsService) {}

  @Post()
  create(@Body() dto: CreateSubscriptionDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('customerId') customerId?: string) {
    return this.service.findAll(customerId);
  }

  @Patch(':id/pause')
  pause(@Param('id') id: string) {
    return this.service.pause(id);
  }

  @Patch(':id/resume')
  resume(@Param('id') id: string) {
    return this.service.resume(id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('run-due')
  runDue() {
    return this.service.runDueSubscriptions();
  }
}
