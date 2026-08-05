import { BadRequestException, Injectable } from '@nestjs/common';
import { ProductionOrderIngredientIssue } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AccountingService } from '../accounting/accounting.service';
import { ACCOUNT_CODES } from '../accounting/account-codes';
import { buildBatchNumber, buildRunningNumber } from '../common/utils/document-number.util';
import {
  CompleteProductionOrderDto,
  CreateProductionOrderDto,
  CreateProductionPlanDto,
} from './dto/production.dto';

const BATCH_PREFIX = 'BLM';

@Injectable()
export class ProductionService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
    private accounting: AccountingService,
  ) {}

  // ---- Production Plan ------------------------------------------------------

  createPlan(dto: CreateProductionPlanDto) {
    return this.prisma.productionPlan.create({
      data: {
        planDate: new Date(dto.planDate),
        notes: dto.notes,
        createdById: dto.createdById,
        items: { create: dto.items },
      },
      include: { items: { include: { product: true } } },
    });
  }

  findPlans() {
    return this.prisma.productionPlan.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { planDate: 'desc' },
    });
  }

  // ---- Production Order ------------------------------------------------------

  async createOrder(dto: CreateProductionOrderDto) {
    const recipe = await this.prisma.recipe.findUniqueOrThrow({
      where: { id: dto.recipeId },
      include: { ingredients: true },
    });
    if (recipe.productId !== dto.productId) {
      throw new BadRequestException('Recipe does not belong to the specified product');
    }

    const count = await this.prisma.productionOrder.count();
    return this.prisma.productionOrder.create({
      data: {
        orderNumber: buildRunningNumber('PRO', count + 1),
        productId: dto.productId,
        recipeId: dto.recipeId,
        warehouseId: dto.warehouseId,
        plannedQuantity: dto.plannedQuantity,
        scheduledDate: new Date(dto.scheduledDate),
        operatorId: dto.operatorId,
        createdById: dto.createdById,
      },
      include: { product: true, recipe: { include: { ingredients: { include: { rawMaterial: true } } } } },
    });
  }

  findOrders(status?: string) {
    return this.prisma.productionOrder.findMany({
      where: status ? { status: status as any } : undefined,
      include: { product: true, recipe: true, batch: true, operator: true },
      orderBy: { scheduledDate: 'desc' },
    });
  }

  findOrder(id: string) {
    return this.prisma.productionOrder.findUniqueOrThrow({
      where: { id },
      include: {
        product: true,
        recipe: { include: { ingredients: { include: { rawMaterial: true } } } },
        ingredientIssues: { include: { rawMaterial: true, rawMaterialLot: { include: { supplier: true } } } },
        batch: true,
        operator: true,
      },
    });
  }

  /**
   * Issues ingredients for a production order using FEFO allocation from raw
   * material lots in the order's warehouse, scaled to the planned quantity.
   */
  async startProduction(orderId: string) {
    const order = await this.prisma.productionOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: { recipe: { include: { ingredients: true } } },
    });
    if (order.status !== 'PLANNED') {
      throw new BadRequestException(`Production order is already ${order.status}`);
    }

    const factor = Number(order.plannedQuantity) / Number(order.recipe.standardYieldQty);

    const issues = await this.prisma.$transaction(async (tx) => {
      const created: ProductionOrderIngredientIssue[] = [];
      for (const ingredient of order.recipe.ingredients) {
        const requiredQty = Number(ingredient.quantity) * factor;
        // Ingredients are issued from Raw Material warehouse(s), not the
        // production floor warehouse itself — FEFO across all of them.
        const lots = await tx.rawMaterialLot.findMany({
          where: {
            rawMaterialId: ingredient.rawMaterialId,
            quantityRemaining: { gt: 0 },
            warehouse: { type: 'RAW_MATERIAL' },
          },
          orderBy: [{ expiryDate: { sort: 'asc', nulls: 'last' } }, { receivedDate: 'asc' }],
        });

        const totalAvailable = lots.reduce((sum, l) => sum + Number(l.quantityRemaining), 0);
        if (totalAvailable < requiredQty) {
          throw new BadRequestException(
            `Insufficient stock of raw material ${ingredient.rawMaterialId} in a Raw Material warehouse: need ${requiredQty}, have ${totalAvailable}`,
          );
        }

        let remaining = requiredQty;
        for (const lot of lots) {
          if (remaining <= 0) break;
          const takeQty = Math.min(Number(lot.quantityRemaining), remaining);

          await tx.rawMaterialLot.update({
            where: { id: lot.id },
            data: { quantityRemaining: { decrement: takeQty } },
          });

          const issue = await tx.productionOrderIngredientIssue.create({
            data: {
              productionOrderId: orderId,
              rawMaterialId: ingredient.rawMaterialId,
              rawMaterialLotId: lot.id,
              quantityIssued: takeQty,
              unit: ingredient.unit,
            },
          });
          created.push(issue);

          await tx.stockMovement.create({
            data: {
              type: 'PRODUCTION_ISSUE',
              itemType: 'RAW_MATERIAL',
              rawMaterialLotId: lot.id,
              fromWarehouseId: lot.warehouseId,
              toWarehouseId: order.warehouseId,
              quantity: takeQty,
              reference: order.orderNumber,
            },
          });

          remaining -= takeQty;
        }
      }

      await tx.productionOrder.update({
        where: { id: orderId },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });

      return created;
    });

    return this.findOrder(orderId);
  }

  /**
   * Completes a production order: records actual yield, creates the finished
   * goods batch (with expiry derived from product shelf life), receives it
   * into the finished-goods warehouse, and posts the manufacturing journal
   * (Dr Finished Goods / Cr Raw Materials) at the cost of consumed ingredients.
   */
  async completeProduction(orderId: string, dto: CompleteProductionOrderDto) {
    const order = await this.prisma.productionOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        product: true,
        recipe: true,
        ingredientIssues: { include: { rawMaterialLot: true } },
      },
    });
    if (order.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Production order must be IN_PROGRESS to complete');
    }

    const todayCount = await this.prisma.finishedGoodsBatch.count({
      where: { productId: order.productId, productionDate: { gte: startOfDay() } },
    });
    const batchNumber = buildBatchNumber(BATCH_PREFIX, new Date(), todayCount);

    const productionDate = new Date();
    const expiryDate = new Date(productionDate.getTime() + order.product.shelfLifeDays * 86400000);

    const ingredientCost = order.ingredientIssues.reduce(
      (sum, issue) => sum + Number(issue.quantityIssued) * Number(issue.rawMaterialLot.unitCost),
      0,
    );

    const batch = await this.prisma.$transaction(async (tx) => {
      const createdBatch = await tx.finishedGoodsBatch.create({
        data: {
          batchNumber,
          productId: order.productId,
          productionOrderId: orderId,
          productionDate,
          expiryDate,
          quantityProduced: dto.actualYieldQty,
          unitCost: dto.actualYieldQty > 0 ? ingredientCost / dto.actualYieldQty : 0,
        },
      });

      await tx.finishedGoodsStock.create({
        data: {
          batchId: createdBatch.id,
          warehouseId: dto.finishedGoodsWarehouseId,
          quantity: dto.actualYieldQty,
        },
      });

      await tx.stockMovement.create({
        data: {
          type: 'PRODUCTION_RECEIPT',
          itemType: 'FINISHED_GOODS',
          finishedGoodsBatchId: createdBatch.id,
          toWarehouseId: dto.finishedGoodsWarehouseId,
          quantity: dto.actualYieldQty,
          reference: order.orderNumber,
        },
      });

      await tx.productionOrder.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          actualYieldQty: dto.actualYieldQty,
          completedAt: new Date(),
          operatorId: dto.operatorId ?? order.operatorId,
        },
      });

      return createdBatch;
    });

    await this.accounting.postJournal({
      sourceType: 'PRODUCTION',
      sourceId: order.id,
      description: `Production order ${order.orderNumber} — batch ${batchNumber}`,
      lines: [
        { accountCode: ACCOUNT_CODES.INVENTORY_FINISHED_GOODS, debit: ingredientCost },
        { accountCode: ACCOUNT_CODES.INVENTORY_RAW_MATERIAL, credit: ingredientCost },
      ],
    });

    const standardYield = Number(order.plannedQuantity);
    const yieldVariancePct =
      standardYield > 0 ? ((dto.actualYieldQty - standardYield) / standardYield) * 100 : 0;

    return { batch, ingredientCost, standardYield, actualYield: dto.actualYieldQty, yieldVariancePct };
  }

  cancelOrder(orderId: string) {
    return this.prisma.productionOrder.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
  }
}

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
