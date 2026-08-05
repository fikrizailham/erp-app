import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  findAll(status?: string) {
    return this.prisma.product.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: { recipes: { include: { ingredients: { include: { rawMaterial: true } } } } },
    });
  }

  update(id: string, dto: UpdateProductDto) {
    return this.prisma.product.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.product.update({ where: { id }, data: { status: 'DISCONTINUED' } });
  }
}
