import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { RawMaterialCategory } from '@prisma/client';

export class CreateRawMaterialDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsEnum(RawMaterialCategory)
  category: RawMaterialCategory;

  @IsString()
  unit: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  shelfLifeDays?: number;
}
