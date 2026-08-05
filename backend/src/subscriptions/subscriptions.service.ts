import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SalesService } from '../pos/sales.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private salesService: SalesService,
  ) {}

  create(dto: CreateSubscriptionDto) {
    return this.prisma.subscription.create({
      data: {
        customerId: dto.customerId,
        name: dto.name,
        frequency: dto.frequency,
        dayOfWeek: dto.dayOfWeek,
        dayOfMonth: dto.dayOfMonth,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        nextRunDate: new Date(dto.startDate),
        items: { create: dto.items },
      },
      include: { items: { include: { product: true } } },
    });
  }

  findAll(customerId?: string) {
    return this.prisma.subscription.findMany({
      where: customerId ? { customerId } : undefined,
      include: { items: { include: { product: true } }, customer: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  pause(id: string) {
    return this.prisma.subscription.update({ where: { id }, data: { status: 'PAUSED' } });
  }

  resume(id: string) {
    return this.prisma.subscription.update({ where: { id }, data: { status: 'ACTIVE' } });
  }

  cancel(id: string) {
    return this.prisma.subscription.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  /**
   * Auto-creates POS sales for subscriptions due today and advances their
   * nextRunDate. Runs daily; can also be triggered manually via the API for
   * demos/testing.
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async runDueSubscriptions() {
    const now = new Date();
    const due = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', nextRunDate: { lte: now } },
      include: { items: true },
    });

    const outlet = await this.prisma.warehouse.findFirst({ where: { type: 'OUTLET', isActive: true } });
    if (!outlet) {
      this.logger.warn('No active OUTLET warehouse configured; skipping subscription auto-orders');
      return;
    }

    for (const sub of due) {
      try {
        await this.salesService.createSale({
          channel: 'ONLINE',
          customerId: sub.customerId,
          warehouseId: outlet.id,
          paymentMethod: 'BANK_TRANSFER',
          items: sub.items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
        });
      } catch (err) {
        this.logger.error(`Failed to auto-generate order for subscription ${sub.id}: ${err.message}`);
        continue;
      }

      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { nextRunDate: this.computeNextRunDate(sub) },
      });
    }
  }

  private computeNextRunDate(sub: { frequency: string; nextRunDate: Date }): Date {
    const next = new Date(sub.nextRunDate);
    if (sub.frequency === 'DAILY') next.setDate(next.getDate() + 1);
    else if (sub.frequency === 'WEEKLY') next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    return next;
  }
}
