import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class TransferStockDto {
  @IsIn(['RAW_MATERIAL', 'FINISHED_GOODS'])
  itemType: 'RAW_MATERIAL' | 'FINISHED_GOODS';

  /** RawMaterialLot id or FinishedGoodsBatch id, depending on itemType */
  @IsString()
  itemId: string;

  @IsString()
  toWarehouseId: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AdjustStockDto {
  @IsIn(['RAW_MATERIAL', 'FINISHED_GOODS'])
  itemType: 'RAW_MATERIAL' | 'FINISHED_GOODS';

  @IsString()
  itemId: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  /** Positive to increase, negative to decrease */
  @IsNumber()
  quantityDelta: number;

  @IsString()
  note: string;
}
