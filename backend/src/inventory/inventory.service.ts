import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { AdjustStockDto, TransferStockDto } from './dto/transfer-stock.dto';
import { CreateStockOpnameDto } from './dto/stock-opname.dto';
import { buildRunningNumber } from '../common/utils/document-number.util';

const EXPIRY_SOON_DAYS = 7;
const EXPIRY_CRITICAL_DAYS = 3;

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ---- Warehouses -------------------------------------------------------

  createWarehouse(dto: CreateWarehouseDto) {
    return this.prisma.warehouse.create({ data: dto });
  }

  findWarehouses(type?: string) {
    return this.prisma.warehouse.findMany({
      where: type ? { type: type as any } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  // ---- Stock views --------------------------------------------------------

  rawMaterialStock(warehouseId?: string) {
    return this.prisma.rawMaterialLot.findMany({
      where: {
        quantityRemaining: { gt: 0 },
        ...(warehouseId ? { warehouseId } : {}),
      },
      include: { rawMaterial: true, warehouse: true, supplier: true },
      orderBy: { expiryDate: 'asc' },
    });
  }

  finishedGoodsStock(warehouseId?: string) {
    return this.prisma.finishedGoodsStock.findMany({
      where: {
        quantity: { gt: 0 },
        ...(warehouseId ? { warehouseId } : {}),
      },
      include: { batch: { include: { product: true } }, warehouse: true },
      orderBy: { batch: { expiryDate: 'asc' } },
    });
  }

  // ---- FEFO allocation ----------------------------------------------------

  /**
   * Returns available finished-goods batches for a product in a warehouse,
   * ordered by soonest expiry first (First-Expired-First-Out).
   */
  async fefoFinishedGoods(productId: string, warehouseId: string) {
    return this.prisma.finishedGoodsStock.findMany({
      where: {
        warehouseId,
        quantity: { gt: 0 },
        batch: { productId, status: { in: ['ACTIVE', 'EXPIRING_SOON'] } },
      },
      include: { batch: true },
      orderBy: { batch: { expiryDate: 'asc' } },
    });
  }

  /**
   * Returns available raw material lots for a material in a warehouse,
   * ordered by soonest expiry first (nulls/non-perishables last).
   */
  async fefoRawMaterialLots(rawMaterialId: string, warehouseId: string) {
    return this.prisma.rawMaterialLot.findMany({
      where: { rawMaterialId, warehouseId, quantityRemaining: { gt: 0 } },
      orderBy: [{ expiryDate: { sort: 'asc', nulls: 'last' } }, { receivedDate: 'asc' }],
    });
  }

  // ---- Expiry alerts --------------------------------------------------------

  async expiryAlerts() {
    const now = new Date();
    const soonThreshold = new Date(now.getTime() + EXPIRY_SOON_DAYS * 86400000);

    const batches = await this.prisma.finishedGoodsBatch.findMany({
      where: {
        status: { not: 'DEPLETED' },
        expiryDate: { lte: soonThreshold },
      },
      include: {
        product: true,
        stocks: { include: { warehouse: true }, where: { quantity: { gt: 0 } } },
      },
      orderBy: { expiryDate: 'asc' },
    });

    type BatchAlertEntry = (typeof batches)[number] & { remainingQty: number; daysToExpiry: number };
    const expired: BatchAlertEntry[] = [];
    const critical: BatchAlertEntry[] = []; // expiring within 3 days
    const soon: BatchAlertEntry[] = []; // expiring within 7 days

    for (const batch of batches) {
      const remainingQty = batch.stocks.reduce((sum, s) => sum + Number(s.quantity), 0);
      if (remainingQty <= 0) continue;

      const daysToExpiry = Math.ceil((batch.expiryDate.getTime() - now.getTime()) / 86400000);
      const entry = { ...batch, remainingQty, daysToExpiry };

      if (daysToExpiry < 0) expired.push(entry);
      else if (daysToExpiry <= EXPIRY_CRITICAL_DAYS) critical.push(entry);
      else soon.push(entry);
    }

    const rawMaterialLots = await this.prisma.rawMaterialLot.findMany({
      where: { quantityRemaining: { gt: 0 }, expiryDate: { lte: soonThreshold, not: null } },
      include: { rawMaterial: true, warehouse: true },
      orderBy: { expiryDate: 'asc' },
    });

    const rawExpired = rawMaterialLots.filter((l) => l.expiryDate! < now);
    const rawCritical = rawMaterialLots.filter(
      (l) => l.expiryDate! >= now && Math.ceil((l.expiryDate!.getTime() - now.getTime()) / 86400000) <= EXPIRY_CRITICAL_DAYS,
    );
    const rawSoon = rawMaterialLots.filter(
      (l) => Math.ceil((l.expiryDate!.getTime() - now.getTime()) / 86400000) > EXPIRY_CRITICAL_DAYS,
    );

    return {
      finishedGoods: { expired, expiringIn3Days: critical, expiringIn7Days: soon },
      rawMaterials: { expired: rawExpired, expiringIn3Days: rawCritical, expiringIn7Days: rawSoon },
    };
  }

  /** Marks batches past their expiry date as EXPIRED. Intended to run on a daily schedule. */
  async syncBatchStatuses() {
    const now = new Date();
    const soonThreshold = new Date(now.getTime() + EXPIRY_SOON_DAYS * 86400000);

    await this.prisma.finishedGoodsBatch.updateMany({
      where: { expiryDate: { lt: now }, status: { notIn: ['EXPIRED', 'DEPLETED'] } },
      data: { status: 'EXPIRED' },
    });
    await this.prisma.finishedGoodsBatch.updateMany({
      where: {
        expiryDate: { gte: now, lte: soonThreshold },
        status: 'ACTIVE',
      },
      data: { status: 'EXPIRING_SOON' },
    });
  }

  // ---- Transfers & adjustments ---------------------------------------------

  async transferStock(dto: TransferStockDto) {
    if (dto.itemType === 'FINISHED_GOODS') {
      return this.transferFinishedGoods(dto.itemId, dto.toWarehouseId, dto.quantity, dto.note);
    }
    return this.transferRawMaterialLot(dto.itemId, dto.toWarehouseId, dto.quantity, dto.note);
  }

  private async transferFinishedGoods(
    batchId: string,
    toWarehouseId: string,
    quantity: number,
    note?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Find source stock rows (any warehouse) with the largest quantity first.
      const sourceStocks = await tx.finishedGoodsStock.findMany({
        where: { batchId, quantity: { gt: 0 } },
      });
      const totalAvailable = sourceStocks.reduce((s, r) => s + Number(r.quantity), 0);
      if (totalAvailable < quantity) {
        throw new BadRequestException('Insufficient finished goods stock for transfer');
      }

      let remainingToMove = quantity;
      for (const stock of sourceStocks) {
        if (remainingToMove <= 0) break;
        const moveQty = Math.min(Number(stock.quantity), remainingToMove);
        await tx.finishedGoodsStock.update({
          where: { id: stock.id },
          data: { quantity: { decrement: moveQty } },
        });
        await tx.stockMovement.create({
          data: {
            type: 'TRANSFER',
            itemType: 'FINISHED_GOODS',
            finishedGoodsBatchId: batchId,
            fromWarehouseId: stock.warehouseId,
            toWarehouseId,
            quantity: moveQty,
            note,
          },
        });
        remainingToMove -= moveQty;
      }

      await tx.finishedGoodsStock.upsert({
        where: { batchId_warehouseId: { batchId, warehouseId: toWarehouseId } },
        update: { quantity: { increment: quantity } },
        create: { batchId, warehouseId: toWarehouseId, quantity },
      });

      return { batchId, toWarehouseId, quantity };
    });
  }

  private async transferRawMaterialLot(
    lotId: string,
    toWarehouseId: string,
    quantity: number,
    note?: string,
  ) {
    const lot = await this.prisma.rawMaterialLot.findUnique({ where: { id: lotId } });
    if (!lot) throw new NotFoundException('Raw material lot not found');
    if (Number(lot.quantityRemaining) < quantity) {
      throw new BadRequestException('Insufficient raw material lot quantity for transfer');
    }

    // MVP: a lot lives in a single warehouse. Full-lot transfer relocates it;
    // partial transfer requires splitting into a new lot record.
    if (quantity === Number(lot.quantityRemaining)) {
      await this.prisma.rawMaterialLot.update({
        where: { id: lotId },
        data: { warehouseId: toWarehouseId },
      });
    } else {
      await this.prisma.$transaction([
        this.prisma.rawMaterialLot.update({
          where: { id: lotId },
          data: { quantityRemaining: { decrement: quantity } },
        }),
        this.prisma.rawMaterialLot.create({
          data: {
            lotNumber: `${lot.lotNumber}-SPLIT-${Date.now()}`,
            rawMaterialId: lot.rawMaterialId,
            supplierId: lot.supplierId,
            warehouseId: toWarehouseId,
            quantityReceived: quantity,
            quantityRemaining: quantity,
            unitCost: lot.unitCost,
            receivedDate: lot.receivedDate,
            expiryDate: lot.expiryDate,
          },
        }),
      ]);
    }

    await this.prisma.stockMovement.create({
      data: {
        type: 'TRANSFER',
        itemType: 'RAW_MATERIAL',
        rawMaterialLotId: lotId,
        fromWarehouseId: lot.warehouseId,
        toWarehouseId,
        quantity,
        note,
      },
    });

    return { lotId, toWarehouseId, quantity };
  }

  async adjustStock(dto: AdjustStockDto) {
    if (dto.itemType === 'RAW_MATERIAL') {
      const lot = await this.prisma.rawMaterialLot.update({
        where: { id: dto.itemId },
        data: { quantityRemaining: { increment: dto.quantityDelta } },
      });
      await this.prisma.stockMovement.create({
        data: {
          type: 'ADJUSTMENT',
          itemType: 'RAW_MATERIAL',
          rawMaterialLotId: dto.itemId,
          toWarehouseId: dto.quantityDelta >= 0 ? lot.warehouseId : undefined,
          fromWarehouseId: dto.quantityDelta < 0 ? lot.warehouseId : undefined,
          quantity: Math.abs(dto.quantityDelta),
          note: dto.note,
        },
      });
      return lot;
    }

    if (!dto.warehouseId) {
      throw new BadRequestException('warehouseId is required for finished goods adjustment');
    }
    const stock = await this.prisma.finishedGoodsStock.upsert({
      where: { batchId_warehouseId: { batchId: dto.itemId, warehouseId: dto.warehouseId } },
      update: { quantity: { increment: dto.quantityDelta } },
      create: { batchId: dto.itemId, warehouseId: dto.warehouseId, quantity: dto.quantityDelta },
    });
    await this.prisma.stockMovement.create({
      data: {
        type: 'ADJUSTMENT',
        itemType: 'FINISHED_GOODS',
        finishedGoodsBatchId: dto.itemId,
        toWarehouseId: dto.quantityDelta >= 0 ? dto.warehouseId : undefined,
        fromWarehouseId: dto.quantityDelta < 0 ? dto.warehouseId : undefined,
        quantity: Math.abs(dto.quantityDelta),
        note: dto.note,
      },
    });
    return stock;
  }

  // ---- Batch traceability ---------------------------------------------------

  /** Trace a batch back to its production order, ingredients, and their suppliers. */
  async traceBatch(batchId: string) {
    const batch = await this.prisma.finishedGoodsBatch.findUniqueOrThrow({
      where: { id: batchId },
      include: {
        product: true,
        productionOrder: {
          include: {
            operator: true,
            ingredientIssues: {
              include: { rawMaterial: true, rawMaterialLot: { include: { supplier: true } } },
            },
          },
        },
        stocks: { include: { warehouse: true } },
      },
    });

    const saleItems = await this.prisma.saleItem.findMany({
      where: { batchId },
      include: { sale: { include: { customer: true } } },
    });

    return { batch, soldTo: saleItems };
  }

  /** Trace what a customer purchased, down to the batch level. */
  async traceCustomer(customerId: string) {
    const sales = await this.prisma.sale.findMany({
      where: { customerId },
      include: { items: { include: { product: true, batch: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return sales;
  }

  // ---- Stock Opname -----------------------------------------------------

  async createStockOpname(dto: CreateStockOpnameDto) {
    const count = await this.prisma.stockOpname.count();
    const opnameNumber = buildRunningNumber('OPN', count + 1);

    const lines = await Promise.all(
      dto.lines.map(async (line) => {
        let systemQty = 0;
        if (line.itemType === 'RAW_MATERIAL') {
          const lot = await this.prisma.rawMaterialLot.findUniqueOrThrow({ where: { id: line.itemId } });
          systemQty = Number(lot.quantityRemaining);
        } else {
          const stock = await this.prisma.finishedGoodsStock.findUnique({
            where: { batchId_warehouseId: { batchId: line.itemId, warehouseId: dto.warehouseId } },
          });
          systemQty = stock ? Number(stock.quantity) : 0;
        }
        return {
          itemType: line.itemType,
          rawMaterialLotId: line.itemType === 'RAW_MATERIAL' ? line.itemId : null,
          finishedGoodsBatchId: line.itemType === 'FINISHED_GOODS' ? line.itemId : null,
          systemQty,
          countedQty: line.countedQty,
          variance: line.countedQty - systemQty,
        };
      }),
    );

    return this.prisma.stockOpname.create({
      data: {
        opnameNumber,
        warehouseId: dto.warehouseId,
        createdById: dto.createdById,
        lines: { create: lines },
      },
      include: { lines: true },
    });
  }

  /** Applies the counted variances as stock adjustments and closes the opname. */
  async completeStockOpname(id: string) {
    const opname = await this.prisma.stockOpname.findUniqueOrThrow({
      where: { id },
      include: { lines: true },
    });
    if (opname.status === 'COMPLETED') {
      throw new BadRequestException('Stock opname already completed');
    }

    for (const line of opname.lines) {
      const variance = Number(line.variance);
      if (variance === 0) continue;

      if (line.itemType === 'RAW_MATERIAL' && line.rawMaterialLotId) {
        await this.adjustStock({
          itemType: 'RAW_MATERIAL',
          itemId: line.rawMaterialLotId,
          quantityDelta: variance,
          note: `Stock opname ${opname.opnameNumber}`,
        });
      } else if (line.itemType === 'FINISHED_GOODS' && line.finishedGoodsBatchId) {
        await this.adjustStock({
          itemType: 'FINISHED_GOODS',
          itemId: line.finishedGoodsBatchId,
          warehouseId: opname.warehouseId,
          quantityDelta: variance,
          note: `Stock opname ${opname.opnameNumber}`,
        });
      }
    }

    return this.prisma.stockOpname.update({
      where: { id },
      data: { status: 'COMPLETED' },
      include: { lines: true },
    });
  }

  findOpnames(warehouseId?: string) {
    return this.prisma.stockOpname.findMany({
      where: warehouseId ? { warehouseId } : undefined,
      include: { lines: true, warehouse: true },
      orderBy: { date: 'desc' },
    });
  }
}
