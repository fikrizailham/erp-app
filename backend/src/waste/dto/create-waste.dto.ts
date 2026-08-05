import { IsEnum, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { WasteReason } from '@prisma/client';

export class CreateWasteRecordDto {
  @IsIn(['RAW_MATERIAL', 'FINISHED_GOODS'])
  type: 'RAW_MATERIAL' | 'FINISHED_GOODS';

  @IsOptional()
  @IsString()
  rawMaterialLotId?: string;

  @IsOptional()
  @IsString()
  finishedGoodsBatchId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string; // required when type is FINISHED_GOODS

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsString()
  unit: string;

  @IsEnum(WasteReason)
  reason: WasteReason;

  @IsOptional()
  @IsString()
  recordedById?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
