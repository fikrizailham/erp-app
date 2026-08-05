import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({ data: dto });
  }

  findAll(type?: string) {
    return this.prisma.supplier.findMany({
      where: type ? { type: type as any } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.supplier.findUniqueOrThrow({
      where: { id },
      include: { rawMaterials: { include: { rawMaterial: true } } },
    });
  }

  update(id: string, dto: UpdateSupplierDto) {
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  /** Supplier performance: PO count, on-time GR rate, and current price list. */
  async performance(id: string) {
    const purchaseOrders = await this.prisma.purchaseOrder.findMany({
      where: { supplierId: id },
      include: { goodsReceipts: true },
    });

    const totalOrders = purchaseOrders.length;
    const ordersWithReceipt = purchaseOrders.filter((po) => po.goodsReceipts.length > 0);
    const onTimeOrders = ordersWithReceipt.filter((po) => {
      const firstReceipt = po.goodsReceipts[0];
      return po.expectedDate && firstReceipt && firstReceipt.receivedDate <= po.expectedDate;
    });

    const priceHistory = await this.prisma.priceHistory.findMany({
      where: { supplierId: id },
      orderBy: { effectiveDate: 'desc' },
      include: { rawMaterial: true },
    });

    return {
      totalOrders,
      onTimeDeliveryRate:
        ordersWithReceipt.length > 0 ? onTimeOrders.length / ordersWithReceipt.length : null,
      priceHistory,
    };
  }
}
