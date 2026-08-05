import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, CreateLoyaltyTierDto } from './dto/loyalty.dto';

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  createTier(dto: CreateLoyaltyTierDto) {
    return this.prisma.loyaltyTier.create({ data: dto });
  }

  findTiers() {
    return this.prisma.loyaltyTier.findMany({ orderBy: { minPoints: 'asc' } });
  }

  createCoupon(dto: CreateCouponDto) {
    return this.prisma.coupon.create({
      data: { ...dto, validFrom: new Date(dto.validFrom), validTo: new Date(dto.validTo) },
    });
  }

  findCoupons(activeOnly?: boolean) {
    return this.prisma.coupon.findMany({
      where: activeOnly ? { isActive: true, validTo: { gte: new Date() } } : undefined,
      orderBy: { validFrom: 'desc' },
    });
  }
}
