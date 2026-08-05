import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min } from 'class-validator';
import { InventoryCategory, StockTxType } from '@prisma/client';

export class CreateInventoryItemDto {
  @IsUUID() centerId: string;
  @IsString() name: string;
  @IsEnum(InventoryCategory) category: InventoryCategory;
  @IsNumber() @Min(0) currentStock: number;
  @IsNumber() @IsPositive() reorderThreshold: number;
  @IsString() unit: string;
}

export class UpdateInventoryItemDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(InventoryCategory) category?: InventoryCategory;
  @IsOptional() @IsNumber() @IsPositive() reorderThreshold?: number;
  @IsOptional() @IsString() unit?: string;
}

export class CreateStockTransactionDto {
  @IsUUID() itemId: string;
  @IsEnum(StockTxType) type: StockTxType;
  @IsNumber() @IsPositive() quantity: number;
  @IsOptional() @IsString() reason?: string;
}
