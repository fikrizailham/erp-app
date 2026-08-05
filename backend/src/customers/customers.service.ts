import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateCustomerDto) {
    return this.prisma.customer.create({ data: dto });
  }

  findAll(search?: string) {
    return this.prisma.customer.findMany({
      where: search
        ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] }
        : undefined,
      include: { loyaltyTier: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.customer.findUniqueOrThrow({
      where: { id },
      include: {
        loyaltyTier: true,
        sales: { include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' }, take: 20 },
        subscriptions: { include: { items: { include: { product: true } } } },
      },
    });
  }

  update(id: string, dto: UpdateCustomerDto) {
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  /** Purchase history summarized by favorite (most-purchased) products. */
  async favoriteProducts(id: string) {
    const items = await this.prisma.saleItem.findMany({
      where: { sale: { customerId: id } },
      include: { product: true },
    });
    const byProduct = new Map<string, { name: string; totalQuantity: number }>();
    for (const item of items) {
      const entry = byProduct.get(item.productId) ?? { name: item.product.name, totalQuantity: 0 };
      entry.totalQuantity += Number(item.quantity);
      byProduct.set(item.productId, entry);
    }
    return Array.from(byProduct.entries())
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity);
  }

  async addLoyaltyPoints(id: string, points: number) {
    const customer = await this.prisma.customer.update({
      where: { id },
      data: { loyaltyPoints: { increment: points } },
    });

    // Auto-promote tier if a higher tier threshold is now met.
    const eligibleTier = await this.prisma.loyaltyTier.findFirst({
      where: { minPoints: { lte: customer.loyaltyPoints } },
      orderBy: { minPoints: 'desc' },
    });
    if (eligibleTier && eligibleTier.id !== customer.loyaltyTierId) {
      return this.prisma.customer.update({ where: { id }, data: { loyaltyTierId: eligibleTier.id } });
    }
    return customer;
  }
}
