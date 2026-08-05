import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class CreateProductionPlanItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(0.001)
  plannedQuantity: number;
}

export class CreateProductionPlanDto {
  @IsDateString()
  planDate: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductionPlanItemDto)
  items: CreateProductionPlanItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  createdById?: string;
}

export class CreateProductionOrderDto {
  @IsString()
  productId: string;

  @IsString()
  recipeId: string;

  @IsString()
  warehouseId: string;

  @IsNumber()
  @Min(0.001)
  plannedQuantity: number;

  @IsDateString()
  scheduledDate: string;

  @IsOptional()
  @IsString()
  operatorId?: string;

  @IsOptional()
  @IsString()
  createdById?: string;
}

export class CompleteProductionOrderDto {
  @IsNumber()
  @Min(0)
  actualYieldQty: number;

  @IsString()
  finishedGoodsWarehouseId: string;

  @IsOptional()
  @IsString()
  operatorId?: string;
}
