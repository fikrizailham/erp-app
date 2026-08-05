import { BadRequestException, Injectable } from '@nestjs/common';
import { Coupon, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AccountingService } from '../accounting/accounting.service';
import { ACCOUNT_CODES } from '../accounting/account-codes';
import { buildRunningNumber } from '../common/utils/document-number.util';
import { CreateSaleDto } from './dto/create-sale.dto';

const CASH_LIKE_ACCOUNT: Record<PaymentMethod, string> = {
  CASH: ACCOUNT_CODES.CASH,
  QRIS: ACCOUNT_CODES.BANK,
  EWALLET: ACCOUNT_CODES.BANK,
  CARD: ACCOUNT_CODES.BANK,
  BANK_TRANSFER: ACCOUNT_CODES.BANK,
};

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
    private accounting: AccountingService,
  ) {}

  /** Product lookup for the cashier screen — by barcode/SKU/name. */
  async searchProducts(query: string) {
    return this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { barcode: query },
          { sku: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
  }

  /**
   * Creates a POS sale: allocates stock strictly FEFO (earliest-expiring
   * batch first) per item, applies coupon discount, posts revenue + COGS
   * journals, and awards loyalty points to member customers.
   */
  async createSale(dto: CreateSaleDto) {
    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.items.map((i) => i.productId) } },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    let coupon: Coupon | null = null;
    if (dto.couponId) {
      coupon = await this.prisma.coupon.findUniqueOrThrow({ where: { id: dto.couponId } });
      if (!coupon.isActive || coupon.validTo < new Date() || coupon.validFrom > new Date()) {
        throw new BadRequestException('Coupon is not valid');
      }
      if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
        throw new BadRequestException('Coupon usage limit reached');
      }
    }

    const count = await this.prisma.sale.count();
    const saleNumber = buildRunningNumber('SALE', count + 1);

    const result = await this.prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let cogs = 0;
      const saleItemsData: {
        productId: string;
        batchId: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        subtotal: number;
      }[] = [];

      for (const item of dto.items) {
        const product = productById.get(item.productId);
        if (!product) throw new BadRequestException(`Unknown product ${item.productId}`);

        const availableStocks = await tx.finishedGoodsStock.findMany({
          where: {
            warehouseId: dto.warehouseId,
            quantity: { gt: 0 },
            batch: { productId: item.productId, status: { in: ['ACTIVE', 'EXPIRING_SOON'] } },
          },
          include: { batch: true },
          orderBy: { batch: { expiryDate: 'asc' } },
        });

        const totalAvailable = availableStocks.reduce((sum, s) => sum + Number(s.quantity), 0);
        if (totalAvailable < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name} in this outlet: need ${item.quantity}, have ${totalAvailable}`,
          );
        }

        let remaining = item.quantity;
        const unitPrice = Number(product.sellingPrice);
        const lineDiscount = item.discount ?? 0;

        for (const stock of availableStocks) {
          if (remaining <= 0) break;
          const takeQty = Math.min(Number(stock.quantity), remaining);

          await tx.finishedGoodsStock.update({
            where: { id: stock.id },
            data: { quantity: { decrement: takeQty } },
          });
          await tx.stockMovement.create({
            data: {
              type: 'SALE',
              itemType: 'FINISHED_GOODS',
              finishedGoodsBatchId: stock.batchId,
              fromWarehouseId: dto.warehouseId,
              quantity: takeQty,
              reference: saleNumber,
            },
          });

          const lineSubtotal = takeQty * unitPrice - lineDiscount * (takeQty / item.quantity);
          saleItemsData.push({
            productId: item.productId,
            batchId: stock.batchId,
            quantity: takeQty,
            unitPrice,
            discount: lineDiscount * (takeQty / item.quantity),
            subtotal: lineSubtotal,
          });

          subtotal += lineSubtotal;
          cogs += takeQty * Number(stock.batch.unitCost);
          remaining -= takeQty;
        }
      }

      const couponDiscount = coupon
        ? coupon.discountType === 'PERCENT'
          ? (subtotal * Number(coupon.discountValue)) / 100
          : Number(coupon.discountValue)
        : 0;
      const totalAmount = Math.max(0, subtotal - couponDiscount);

      const sale = await tx.sale.create({
        data: {
          saleNumber,
          channel: dto.channel ?? 'WALK_IN',
          customerId: dto.customerId,
          cashierId: dto.cashierId,
          warehouseId: dto.warehouseId,
          couponId: dto.couponId,
          subtotal,
          discountAmount: couponDiscount,
          taxAmount: 0,
          totalAmount,
          paymentMethod: dto.paymentMethod,
          paymentStatus: 'PAID',
          items: { create: saleItemsData },
        },
        include: { items: { include: { product: true, batch: true } }, customer: true },
      });

      if (coupon) {
        await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
      }

      if (dto.customerId) {
        const pointsEarned = Math.floor(totalAmount / 10000); // 1 point per Rp 10,000 spent
        if (pointsEarned > 0) {
          await tx.customer.update({
            where: { id: dto.customerId },
            data: { loyaltyPoints: { increment: pointsEarned } },
          });
        }
      }

      return { sale, subtotal, cogs, totalAmount };
    });

    // Dr Cash/Bank / Cr Sales Revenue
    await this.accounting.postJournal({
      sourceType: 'SALE',
      sourceId: result.sale.id,
      description: `POS sale ${saleNumber}`,
      lines: [
        { accountCode: CASH_LIKE_ACCOUNT[dto.paymentMethod], debit: result.totalAmount },
        { accountCode: ACCOUNT_CODES.SALES_DISCOUNTS, debit: result.subtotal - result.totalAmount },
        { accountCode: ACCOUNT_CODES.SALES_REVENUE, credit: result.subtotal },
      ],
    });

    // Dr COGS / Cr Inventory (Finished Goods)
    if (result.cogs > 0) {
      await this.accounting.postJournal({
        sourceType: 'SALE',
        sourceId: result.sale.id,
        description: `COGS for sale ${saleNumber}`,
        lines: [
          { accountCode: ACCOUNT_CODES.COGS, debit: result.cogs },
          { accountCode: ACCOUNT_CODES.INVENTORY_FINISHED_GOODS, credit: result.cogs },
        ],
      });
    }

    await this.inventory.syncBatchStatuses();

    return result.sale;
  }

  findAll(params: { from?: string; to?: string; channel?: string }) {
    return this.prisma.sale.findMany({
      where: {
        channel: params.channel ? (params.channel as any) : undefined,
        createdAt: {
          gte: params.from ? new Date(params.from) : undefined,
          lte: params.to ? new Date(params.to) : undefined,
        },
      },
      include: { items: { include: { product: true } }, customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.sale.findUniqueOrThrow({
      where: { id },
      include: { items: { include: { product: true, batch: true } }, customer: true, cashier: true, warehouse: true },
    });
  }

  /** Receipt payload including batch number, production date, and expiry date per line — as required for cold-pressed juice traceability. */
  async getReceipt(id: string) {
    const sale = await this.findOne(id);
    return {
      saleNumber: sale.saleNumber,
      createdAt: sale.createdAt,
      cashier: sale.cashier?.name,
      customer: sale.customer?.name,
      paymentMethod: sale.paymentMethod,
      items: sale.items.map((item) => ({
        productName: item.product.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        batchNumber: item.batch.batchNumber,
        productionDate: item.batch.productionDate,
        expiryDate: item.batch.expiryDate,
      })),
      subtotal: Number(sale.subtotal),
      discountAmount: Number(sale.discountAmount),
      taxAmount: Number(sale.taxAmount),
      totalAmount: Number(sale.totalAmount),
    };
  }
}
