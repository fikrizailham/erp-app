import { Injectable } from '@nestjs/common';
import { MarketplaceName, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Future-ready integration surface for Tokopedia, Shopee, and TikTok Shop.
 * Each channel's webhook/poller (implemented per-marketplace API in a later
 * phase) should call `recordIncomingOrder` to sync orders, inventory, and
 * shipment status into the core ERP without touching POS/production logic.
 */
@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  findChannels() {
    return this.prisma.marketplaceChannel.findMany();
  }

  upsertChannel(name: MarketplaceName, isActive: boolean, apiConfig?: Prisma.InputJsonValue) {
    return this.prisma.marketplaceChannel.upsert({
      where: { name },
      update: { isActive, apiConfig: apiConfig ?? Prisma.JsonNull },
      create: { name, isActive, apiConfig: apiConfig ?? Prisma.JsonNull },
    });
  }

  async recordIncomingOrder(
    channelName: MarketplaceName,
    externalOrderId: string,
    status: string,
    rawPayload: Prisma.InputJsonValue,
  ) {
    const channel = await this.prisma.marketplaceChannel.upsert({
      where: { name: channelName },
      update: {},
      create: { name: channelName, isActive: true },
    });

    return this.prisma.marketplaceOrder.upsert({
      where: { channelId_externalOrderId: { channelId: channel.id, externalOrderId } },
      update: { status, rawPayload, syncedAt: new Date() },
      create: { channelId: channel.id, externalOrderId, status, rawPayload },
    });
  }

  findOrders(channelName?: MarketplaceName) {
    return this.prisma.marketplaceOrder.findMany({
      where: channelName ? { channel: { name: channelName } } : undefined,
      include: { channel: true },
      orderBy: { syncedAt: 'desc' },
    });
  }
}
