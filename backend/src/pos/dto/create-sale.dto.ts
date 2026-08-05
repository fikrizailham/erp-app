import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod, SaleChannel } from '@prisma/client';

export class SaleItemInputDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class CreateSaleDto {
  @IsOptional()
  @IsEnum(SaleChannel)
  channel?: SaleChannel;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  cashierId?: string;

  @IsString()
  warehouseId: string;

  @IsOptional()
  @IsString()
  couponId?: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemInputDto)
  items: SaleItemInputDto[];
}
