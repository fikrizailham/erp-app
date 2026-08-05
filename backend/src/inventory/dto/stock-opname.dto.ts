import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class OpnameLineDto {
  @IsIn(['RAW_MATERIAL', 'FINISHED_GOODS'])
  itemType: 'RAW_MATERIAL' | 'FINISHED_GOODS';

  @IsString()
  itemId: string; // rawMaterialLotId or finishedGoodsBatchId

  @IsNumber()
  @Min(0)
  countedQty: number;
}

export class CreateStockOpnameDto {
  @IsString()
  warehouseId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OpnameLineDto)
  lines: OpnameLineDto[];

  @IsOptional()
  @IsString()
  createdById?: string;
}
