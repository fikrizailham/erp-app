import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AccountingService } from '../accounting/accounting.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
    private accounting: AccountingService,
  ) {}

  async overview() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [salesToday, salesThisMonth, salesByProduct, salesByChannel] = await Promise.all([
      this.prisma.sale.aggregate({ _sum: { totalAmount: true }, _count: true, where: { createdAt: { gte: startOfToday } } }),
      this.prisma.sale.aggregate({ _sum: { totalAmount: true }, _count: true, where: { createdAt: { gte: startOfMonth } } }),
      this.salesByProduct(startOfMonth, now),
      this.salesByChannel(startOfMonth, now),
    ]);

    const [productionToday, yieldStats] = await Promise.all([
      this.prisma.productionOrder.aggregate({
        _sum: { actualYieldQty: true },
        _count: true,
        where: { completedAt: { gte: startOfToday }, status: 'COMPLETED' },
      }),
      this.prisma.productionOrder.findMany({
        where: { status: 'COMPLETED', completedAt: { gte: startOfMonth } },
        select: { plannedQuantity: true, actualYieldQty: true },
      }),
    ]);

    const totalPlanned = yieldStats.reduce((sum, o) => sum + Number(o.plannedQuantity), 0);
    const totalActual = yieldStats.reduce((sum, o) => sum + Number(o.actualYieldQty ?? 0), 0);
    const yieldPct = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : null;

    const wasteThisMonth = await this.prisma.wasteRecord.aggregate({
      _sum: { estimatedValue: true },
      where: { recordedAt: { gte: startOfMonth } },
    });
    const expiryAlerts = await this.inventory.expiryAlerts();

    const rawMaterialStockValue = await this.prisma.rawMaterialLot.aggregate({
      _sum: { quantityRemaining: true },
    });

    const pnl = await this.accounting.profitAndLoss(startOfMonth, now);

    return {
      sales: {
        today: Number(salesToday._sum.totalAmount ?? 0),
        todayCount: salesToday._count,
        thisMonth: Number(salesThisMonth._sum.totalAmount ?? 0),
        thisMonthCount: salesThisMonth._count,
        byProduct: salesByProduct,
        byChannel: salesByChannel,
      },
      manufacturing: {
        productionToday: Number(productionToday._sum.actualYieldQty ?? 0),
        productionOrdersToday: productionToday._count,
        yieldPct,
        wasteValueThisMonth: Number(wasteThisMonth._sum.estimatedValue ?? 0),
      },
      inventory: {
        rawMaterialUnitsInStock: Number(rawMaterialStockValue._sum.quantityRemaining ?? 0),
        expiringFinishedGoods: {
          expired: expiryAlerts.finishedGoods.expired.length,
          in3Days: expiryAlerts.finishedGoods.expiringIn3Days.length,
          in7Days: expiryAlerts.finishedGoods.expiringIn7Days.length,
        },
      },
      finance: {
        revenue: pnl.revenue,
        grossProfit: pnl.grossProfit,
        netProfit: pnl.netProfit,
      },
    };
  }

  private async salesByProduct(from: Date, to: Date) {
    const items = await this.prisma.saleItem.findMany({
      where: { sale: { createdAt: { gte: from, lte: to } } },
      include: { product: true },
    });
    const byProduct = new Map<string, { name: string; revenue: number; units: number }>();
    for (const item of items) {
      const entry = byProduct.get(item.productId) ?? { name: item.product.name, revenue: 0, units: 0 };
      entry.revenue += Number(item.subtotal);
      entry.units += Number(item.quantity);
      byProduct.set(item.productId, entry);
    }
    return Array.from(byProduct.values()).sort((a, b) => b.revenue - a.revenue);
  }

  private async salesByChannel(from: Date, to: Date) {
    const grouped = await this.prisma.sale.groupBy({
      by: ['channel'],
      _sum: { totalAmount: true },
      where: { createdAt: { gte: from, lte: to } },
    });
    return grouped.map((g) => ({ channel: g.channel, revenue: Number(g._sum.totalAmount ?? 0) }));
  }
}
