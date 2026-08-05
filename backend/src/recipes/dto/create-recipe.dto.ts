import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsString, Min, ValidateNested } from 'class-validator';

export class RecipeIngredientDto {
  @IsString()
  rawMaterialId: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsString()
  unit: string;
}

export class CreateRecipeDto {
  @IsString()
  productId: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(1)
  standardYieldQty: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients: RecipeIngredientDto[];
}
