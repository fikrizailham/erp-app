import { Injectable } from '@nestjs/common';
import { DeliveryStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildRunningNumber } from '../common/utils/document-number.util';
import { CreateDeliveryDto } from './dto/create-delivery.dto';

@Injectable()
export class DeliveryService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDeliveryDto) {
    const count = await this.prisma.delivery.count();
    return this.prisma.delivery.create({
      data: {
        deliveryNumber: buildRunningNumber('DLV', count + 1),
        saleId: dto.saleId,
        subscriptionId: dto.subscriptionId,
        customerId: dto.customerId,
        driverId: dto.driverId,
        vehicleId: dto.vehicleId,
        route: dto.route,
        scheduledDate: new Date(dto.scheduledDate),
        notes: dto.notes,
      },
    });
  }

  findAll(status?: string) {
    return this.prisma.delivery.findMany({
      where: status ? { status: status as any } : undefined,
      include: { customer: true, driver: true, vehicle: true, sale: true },
      orderBy: { scheduledDate: 'desc' },
    });
  }

  updateStatus(id: string, status: DeliveryStatus) {
    return this.prisma.delivery.update({
      where: { id },
      data: { status, deliveredAt: status === 'DELIVERED' ? new Date() : undefined },
    });
  }

  createVehicle(plateNumber: string, type?: string) {
    return this.prisma.vehicle.create({ data: { plateNumber, type } });
  }

  findVehicles() {
    return this.prisma.vehicle.findMany({ where: { isActive: true } });
  }
}
