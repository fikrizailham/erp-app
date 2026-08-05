import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { ACCOUNT_CODES } from '../accounting/account-codes';
import { CreateWasteRecordDto } from './dto/create-waste.dto';

@Injectable()
export class WasteService {
  constructor(
    private prisma: PrismaService,
    private accounting: AccountingService,
  ) {}

  async recordWaste(dto: CreateWasteRecordDto) {
    let estimatedValue = 0;
    let rawMaterialId: string | undefined;

    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.type === 'RAW_MATERIAL') {
        if (!dto.rawMaterialLotId) throw new BadRequestException('rawMaterialLotId is required');
        const lot = await tx.rawMaterialLot.findUniqueOrThrow({ where: { id: dto.rawMaterialLotId } });
        if (Number(lot.quantityRemaining) < dto.quantity) {
          throw new BadRequestException('Waste quantity exceeds remaining lot quantity');
        }
        rawMaterialId = lot.rawMaterialId;
        estimatedValue = dto.quantity * Number(lot.unitCost);

        await tx.rawMaterialLot.update({
          where: { id: dto.rawMaterialLotId },
          data: { quantityRemaining: { decrement: dto.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            type: 'WASTE',
            itemType: 'RAW_MATERIAL',
            rawMaterialLotId: dto.rawMaterialLotId,
            fromWarehouseId: lot.warehouseId,
            quantity: dto.quantity,
            note: dto.note,
          },
        });
      } else {
        if (!dto.finishedGoodsBatchId || !dto.warehouseId) {
          throw new BadRequestException('finishedGoodsBatchId and warehouseId are required');
        }
        const batch = await tx.finishedGoodsBatch.findUniqueOrThrow({ where: { id: dto.finishedGoodsBatchId } });
        const stock = await tx.finishedGoodsStock.findUniqueOrThrow({
          where: { batchId_warehouseId: { batchId: dto.finishedGoodsBatchId, warehouseId: dto.warehouseId } },
        });
        if (Number(stock.quantity) < dto.quantity) {
          throw new BadRequestException('Waste quantity exceeds available finished goods stock');
        }
        estimatedValue = dto.quantity * Number(batch.unitCost);

        await tx.finishedGoodsStock.update({
          where: { id: stock.id },
          data: { quantity: { decrement: dto.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            type: 'WASTE',
            itemType: 'FINISHED_GOODS',
            finishedGoodsBatchId: dto.finishedGoodsBatchId,
            fromWarehouseId: dto.warehouseId,
            quantity: dto.quantity,
            note: dto.note,
          },
        });
      }

      return tx.wasteRecord.create({
        data: {
          type: dto.type,
          rawMaterialId,
          rawMaterialLotId: dto.rawMaterialLotId,
          finishedGoodsBatchId: dto.finishedGoodsBatchId,
          quantity: dto.quantity,
          unit: dto.unit,
          reason: dto.reason,
          estimatedValue,
          recordedById: dto.recordedById,
          note: dto.note,
        },
      });
    });

    const expenseAccount =
      dto.type === 'RAW_MATERIAL' ? ACCOUNT_CODES.RAW_MATERIAL_WASTE_EXPENSE : ACCOUNT_CODES.FINISHED_GOODS_WASTE_EXPENSE;
    const inventoryAccount =
      dto.type === 'RAW_MATERIAL' ? ACCOUNT_CODES.INVENTORY_RAW_MATERIAL : ACCOUNT_CODES.INVENTORY_FINISHED_GOODS;

    if (estimatedValue > 0) {
      await this.accounting.postJournal({
        sourceType: 'WASTE',
        sourceId: result.id,
        description: `Waste: ${dto.reason} (${dto.type})`,
        lines: [
          { accountCode: expenseAccount, debit: estimatedValue },
          { accountCode: inventoryAccount, credit: estimatedValue },
        ],
      });
    }

    return result;
  }

  findAll(params: { type?: string; from?: string; to?: string }) {
    return this.prisma.wasteRecord.findMany({
      where: {
        type: params.type ? (params.type as any) : undefined,
        recordedAt: {
          gte: params.from ? new Date(params.from) : undefined,
          lte: params.to ? new Date(params.to) : undefined,
        },
      },
      include: { rawMaterial: true, rawMaterialLot: true, finishedGoodsBatch: { include: { product: true } } },
      orderBy: { recordedAt: 'desc' },
    });
  }

  /** Waste %, value, and trend — grouped by day. */
  async report(from: Date, to: Date) {
    const records = await this.prisma.wasteRecord.findMany({
      where: { recordedAt: { gte: from, lte: to } },
    });

    const totalWasteValue = records.reduce((sum, r) => sum + Number(r.estimatedValue), 0);

    const goodsReceived = await this.prisma.goodsReceiptItem.aggregate({
      _sum: { quantityReceived: true },
      where: { goodsReceipt: { receivedDate: { gte: from, lte: to } } },
    });
    const rawMaterialWasteQty = records
      .filter((r) => r.type === 'RAW_MATERIAL')
      .reduce((sum, r) => sum + Number(r.quantity), 0);
    const rawMaterialReceivedQty = Number(goodsReceived._sum.quantityReceived ?? 0);
    const rawMaterialWastePct =
      rawMaterialReceivedQty > 0 ? (rawMaterialWasteQty / rawMaterialReceivedQty) * 100 : 0;

    const byDay = new Map<string, number>();
    for (const r of records) {
      const day = r.recordedAt.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + Number(r.estimatedValue));
    }
    const trend = Array.from(byDay.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { from, to, totalWasteValue, rawMaterialWastePct, trend };
  }
}
