import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRecipeDto) {
    const existingVersions = await this.prisma.recipe.count({ where: { productId: dto.productId } });

    return this.prisma.recipe.create({
      data: {
        productId: dto.productId,
        name: dto.name,
        version: existingVersions + 1,
        standardYieldQty: dto.standardYieldQty,
        ingredients: {
          create: dto.ingredients.map((i) => ({
            rawMaterialId: i.rawMaterialId,
            quantity: i.quantity,
            unit: i.unit,
          })),
        },
      },
      include: { ingredients: { include: { rawMaterial: true } } },
    });
  }

  findAllForProduct(productId: string) {
    return this.prisma.recipe.findMany({
      where: { productId },
      orderBy: { version: 'desc' },
      include: { ingredients: { include: { rawMaterial: true } } },
    });
  }

  findOne(id: string) {
    return this.prisma.recipe.findUniqueOrThrow({
      where: { id },
      include: { ingredients: { include: { rawMaterial: true } }, product: true },
    });
  }

  deactivate(id: string) {
    return this.prisma.recipe.update({ where: { id }, data: { isActive: false } });
  }

  /**
   * Scales a recipe's ingredient quantities to a target production quantity,
   * used by the production module to compute how much raw material to issue.
   */
  scaleIngredients(
    ingredients: { rawMaterialId: string; quantity: number; unit: string }[],
    standardYieldQty: number,
    targetQty: number,
  ) {
    const factor = targetQty / standardYieldQty;
    return ingredients.map((i) => ({
      rawMaterialId: i.rawMaterialId,
      quantity: Number((i.quantity * factor).toFixed(3)),
      unit: i.unit,
    }));
  }
}
