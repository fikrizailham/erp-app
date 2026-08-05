import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';

@Injectable()
export class RawMaterialsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateRawMaterialDto) {
    return this.prisma.rawMaterial.create({ data: dto });
  }

  findAll(category?: string) {
    return this.prisma.rawMaterial.findMany({
      where: category ? { category: category as any } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.rawMaterial.findUniqueOrThrow({
      where: { id },
      include: { supplierRawMaterials: { include: { supplier: true } } },
    });
  }

  update(id: string, dto: UpdateRawMaterialDto) {
    return this.prisma.rawMaterial.update({ where: { id }, data: dto });
  }

  /** Raw materials at or below their minimum stock level, aggregated across warehouses. */
  async lowStock() {
    const materials = await this.prisma.rawMaterial.findMany({ where: { isActive: true } });
    const lots = await this.prisma.rawMaterialLot.groupBy({
      by: ['rawMaterialId'],
      _sum: { quantityRemaining: true },
    });
    const stockByMaterial = new Map(lots.map((l) => [l.rawMaterialId, Number(l._sum.quantityRemaining ?? 0)]));

    return materials
      .map((m) => ({
        ...m,
        currentStock: stockByMaterial.get(m.id) ?? 0,
      }))
      .filter((m) => m.currentStock <= Number(m.minStockLevel));
  }
}
