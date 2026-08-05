import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CenterAccessService } from '../common/services/center-access.service';
import { CreateInventoryItemDto, CreateStockTransactionDto, UpdateInventoryItemDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService, private centerAccess: CenterAccessService) {}

  createItem(dto: CreateInventoryItemDto, user: AuthenticatedUser) {
    this.centerAccess.assertCanWrite(user, dto.centerId);
    return this.prisma.inventoryItem.create({ data: dto as any });
  }

  async findItems(centerId: string | undefined, lowStockOnly: boolean, user: AuthenticatedUser) {
    const where: Record<string, unknown> = {};
    if (centerId) {
      this.centerAccess.assertCanRead(user, centerId);
      where.centerId = centerId;
    } else {
      Object.assign(where, this.centerAccess.centerWhereClause(user));
    }
    const items = await this.prisma.inventoryItem.findMany({ where, orderBy: { name: 'asc' } });
    if (!lowStockOnly) return items;
    return items.filter((i) => Number(i.currentStock) <= Number(i.reorderThreshold));
  }

  async updateItem(id: string, dto: UpdateInventoryItemDto, user: AuthenticatedUser) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');
    this.centerAccess.assertCanWrite(user, item.centerId);
    return this.prisma.inventoryItem.update({ where: { id }, data: dto });
  }

  async recordTransaction(dto: CreateStockTransactionDto, user: AuthenticatedUser) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: dto.itemId } });
    if (!item) throw new NotFoundException('Item not found');
    this.centerAccess.assertCanWrite(user, item.centerId);

    const delta = dto.type === 'IN' ? dto.quantity : -dto.quantity;
    const newStock = Number(item.currentStock) + delta;
    if (newStock < 0) {
      throw new BadRequestException('Stock transaction would result in negative stock');
    }

    const [transaction] = await this.prisma.$transaction([
      this.prisma.stockTransaction.create({ data: dto }),
      this.prisma.inventoryItem.update({ where: { id: dto.itemId }, data: { currentStock: newStock } }),
    ]);
    return transaction;
  }

  async findTransactions(itemId: string, user: AuthenticatedUser) {
    const item = await this.prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');
    this.centerAccess.assertCanRead(user, item.centerId);
    return this.prisma.stockTransaction.findMany({
      where: { itemId },
      orderBy: { date: 'desc' },
    });
  }
}
