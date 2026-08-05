import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountingService } from '../accounting/accounting.service';
import { ACCOUNT_CODES } from '../accounting/account-codes';
import { buildBatchNumber, buildRunningNumber } from '../common/utils/document-number.util';
import {
  CreateGoodsReceiptDto,
  CreatePurchaseOrderDto,
  CreatePurchaseRequestDto,
} from './dto/purchasing.dto';

@Injectable()
export class PurchasingService {
  constructor(
    private prisma: PrismaService,
    private accounting: AccountingService,
  ) {}

  // ---- Purchase Requests --------------------------------------------------

  async createPurchaseRequest(dto: CreatePurchaseRequestDto) {
    const count = await this.prisma.purchaseRequest.count();
    return this.prisma.purchaseRequest.create({
      data: {
        requestNumber: buildRunningNumber('PR', count + 1),
        notes: dto.notes,
        requestedById: dto.requestedById,
        status: 'SUBMITTED',
        items: {
          create: dto.items.map((i) => ({
            rawMaterialId: i.rawMaterialId,
            quantity: i.quantity,
            neededBy: i.neededBy ? new Date(i.neededBy) : undefined,
          })),
        },
      },
      include: { items: { include: { rawMaterial: true } } },
    });
  }

  findPurchaseRequests(status?: string) {
    return this.prisma.purchaseRequest.findMany({
      where: status ? { status: status as any } : undefined,
      include: { items: { include: { rawMaterial: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  approvePurchaseRequest(id: string) {
    return this.prisma.purchaseRequest.update({ where: { id }, data: { status: 'APPROVED' } });
  }

  // ---- Purchase Orders ------------------------------------------------------

  async createPurchaseOrder(dto: CreatePurchaseOrderDto) {
    const count = await this.prisma.purchaseOrder.count();

    const po = await this.prisma.purchaseOrder.create({
      data: {
        poNumber: buildRunningNumber('PO', count + 1),
        supplierId: dto.supplierId,
        purchaseRequestId: dto.purchaseRequestId,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        createdById: dto.createdById,
        status: 'SENT',
        items: {
          create: dto.items.map((i) => ({
            rawMaterialId: i.rawMaterialId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        },
      },
      include: { items: { include: { rawMaterial: true } }, supplier: true },
    });

    if (dto.purchaseRequestId) {
      await this.prisma.purchaseRequest.update({
        where: { id: dto.purchaseRequestId },
        data: { status: 'CONVERTED' },
      });
    }

    return po;
  }

  findPurchaseOrders(status?: string) {
    return this.prisma.purchaseOrder.findMany({
      where: status ? { status: status as any } : undefined,
      include: { items: { include: { rawMaterial: true } }, supplier: true, goodsReceipts: true },
      orderBy: { orderDate: 'desc' },
    });
  }

  findPurchaseOrder(id: string) {
    return this.prisma.purchaseOrder.findUniqueOrThrow({
      where: { id },
      include: { items: { include: { rawMaterial: true } }, supplier: true, goodsReceipts: true },
    });
  }

  // ---- Goods Receipt (creates raw material lots + accounting journal) -------

  async receiveGoods(dto: CreateGoodsReceiptDto) {
    const po = await this.prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: dto.purchaseOrderId },
      include: { items: { include: { rawMaterial: true } }, supplier: true },
    });
    if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot receive goods for a ${po.status} purchase order`);
    }

    const count = await this.prisma.goodsReceipt.count();
    const grNumber = buildRunningNumber('GR', count + 1);

    let totalCost = 0;

    const result = await this.prisma.$transaction(async (tx) => {
      const gr = await tx.goodsReceipt.create({
        data: {
          grNumber,
          purchaseOrderId: dto.purchaseOrderId,
          warehouseId: dto.warehouseId,
          receivedById: dto.receivedById,
        },
      });

      for (const item of dto.items) {
        const poItem = po.items.find((i) => i.id === item.purchaseOrderItemId);
        if (!poItem) throw new BadRequestException('Purchase order item not found on this PO');

        const grItem = await tx.goodsReceiptItem.create({
          data: {
            goodsReceiptId: gr.id,
            purchaseOrderItemId: poItem.id,
            rawMaterialId: poItem.rawMaterialId,
            quantityOrdered: poItem.quantity,
            quantityReceived: item.quantityReceived,
            unitCost: poItem.unitPrice,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
          },
        });

        const lotCountToday = await tx.rawMaterialLot.count({
          where: { rawMaterialId: poItem.rawMaterialId, receivedDate: { gte: startOfDay() } },
        });
        const lotNumber = buildBatchNumber(
          `RM-${poItem.rawMaterial.sku}-`,
          new Date(),
          lotCountToday,
        );

        const expiryDate =
          item.expiryDate != null
            ? new Date(item.expiryDate)
            : poItem.rawMaterial.shelfLifeDays
              ? new Date(Date.now() + poItem.rawMaterial.shelfLifeDays * 86400000)
              : null;

        await tx.rawMaterialLot.create({
          data: {
            lotNumber,
            rawMaterialId: poItem.rawMaterialId,
            supplierId: po.supplierId,
            warehouseId: dto.warehouseId,
            goodsReceiptItemId: grItem.id,
            quantityReceived: item.quantityReceived,
            quantityRemaining: item.quantityReceived,
            unitCost: poItem.unitPrice,
            expiryDate,
          },
        });

        await tx.stockMovement.create({
          data: {
            type: 'GOODS_RECEIPT',
            itemType: 'RAW_MATERIAL',
            toWarehouseId: dto.warehouseId,
            quantity: item.quantityReceived,
            reference: grNumber,
          },
        });

        totalCost += Number(poItem.unitPrice) * Number(item.quantityReceived);

        // Keep supplier's current price and price history up to date.
        await tx.supplierRawMaterial.upsert({
          where: {
            supplierId_rawMaterialId: { supplierId: po.supplierId, rawMaterialId: poItem.rawMaterialId },
          },
          update: { currentPrice: poItem.unitPrice },
          create: {
            supplierId: po.supplierId,
            rawMaterialId: poItem.rawMaterialId,
            currentPrice: poItem.unitPrice,
          },
        });
        await tx.priceHistory.create({
          data: { supplierId: po.supplierId, rawMaterialId: poItem.rawMaterialId, price: poItem.unitPrice },
        });
      }

      const totalReceivedItems = await tx.goodsReceiptItem.count({
        where: { goodsReceipt: { purchaseOrderId: dto.purchaseOrderId } },
      });
      const isFullyReceived = totalReceivedItems >= po.items.length;
      await tx.purchaseOrder.update({
        where: { id: dto.purchaseOrderId },
        data: { status: isFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
      });

      await tx.supplierInvoice.create({
        data: {
          invoiceNumber: buildRunningNumber('INV', count + 1),
          purchaseOrderId: dto.purchaseOrderId,
          supplierId: po.supplierId,
          amount: totalCost,
          dueDate: new Date(Date.now() + 30 * 86400000),
        },
      });

      return tx.goodsReceipt.findUniqueOrThrow({
        where: { id: gr.id },
        include: { items: { include: { rawMaterial: true, rawMaterialLot: true } } },
      });
    });

    // Dr Inventory (Raw Materials) / Cr Accounts Payable
    await this.accounting.postJournal({
      sourceType: 'PURCHASE',
      sourceId: result.id,
      description: `Goods receipt ${grNumber} from ${po.supplier.name}`,
      lines: [
        { accountCode: ACCOUNT_CODES.INVENTORY_RAW_MATERIAL, debit: totalCost },
        { accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, credit: totalCost },
      ],
    });

    return result;
  }
}

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
