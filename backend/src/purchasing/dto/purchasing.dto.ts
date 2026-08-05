import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class PurchaseRequestItemDto {
  @IsString()
  rawMaterialId: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsOptional()
  @IsDateString()
  neededBy?: string;
}

export class CreatePurchaseRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseRequestItemDto)
  items: PurchaseRequestItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  requestedById?: string;
}

export class PurchaseOrderItemDto {
  @IsString()
  rawMaterialId: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreatePurchaseOrderDto {
  @IsString()
  supplierId: string;

  @IsOptional()
  @IsString()
  purchaseRequestId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  createdById?: string;
}

export class GoodsReceiptItemDto {
  @IsString()
  purchaseOrderItemId: string;

  @IsNumber()
  @Min(0.001)
  quantityReceived: number;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class CreateGoodsReceiptDto {
  @IsString()
  purchaseOrderId: string;

  @IsString()
  warehouseId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GoodsReceiptItemDto)
  items: GoodsReceiptItemDto[];

  @IsOptional()
  @IsString()
  receivedById?: string;
}
