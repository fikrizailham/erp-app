import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { CreateCouponDto, CreateLoyaltyTierDto } from './dto/loyalty.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private service: LoyaltyService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('tiers')
  createTier(@Body() dto: CreateLoyaltyTierDto) {
    return this.service.createTier(dto);
  }

  @Get('tiers')
  findTiers() {
    return this.service.findTiers();
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('coupons')
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.service.createCoupon(dto);
  }

  @Get('coupons')
  findCoupons(@Query('activeOnly') activeOnly?: string) {
    return this.service.findCoupons(activeOnly === 'true');
  }
}
