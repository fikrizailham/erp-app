import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CouponDiscountType } from '@prisma/client';

export class CreateLoyaltyTierDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  minPoints: number;

  @IsNumber()
  @Min(0)
  discountPct: number;

  @IsOptional()
  @IsString()
  benefits?: string;
}

export class CreateCouponDto {
  @IsString()
  code: string;

  @IsEnum(CouponDiscountType)
  discountType: CouponDiscountType;

  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validTo: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;
}
