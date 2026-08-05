import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CenterAccessService } from '../common/services/center-access.service';
import { CreateShiftDto, UpdateShiftDto } from './dto/staff.dto';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService, private centerAccess: CenterAccessService) {}

  create(dto: CreateShiftDto, user: AuthenticatedUser) {
    this.centerAccess.assertCanWrite(user, dto.centerId);
    return this.prisma.shift.create({
      data: {
        ...dto,
        date: new Date(dto.date),
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
      },
    });
  }

  async findAll(
    filters: { centerId?: string; staffId?: string; from?: string; to?: string },
    user: AuthenticatedUser,
  ) {
    const where: Record<string, unknown> = {};
    if (filters.centerId) {
      this.centerAccess.assertCanRead(user, filters.centerId);
      where.centerId = filters.centerId;
    } else {
      Object.assign(where, this.centerAccess.centerWhereClause(user));
    }
    if (filters.staffId) where.staffId = filters.staffId;
    if (filters.from || filters.to) {
      where.date = {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to ? new Date(filters.to) : undefined,
      };
    }
    return this.prisma.shift.findMany({ where, include: { staff: true }, orderBy: { date: 'asc' } });
  }

  async update(id: string, dto: UpdateShiftDto, user: AuthenticatedUser) {
    const shift = await this.prisma.shift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Shift not found');
    this.centerAccess.assertCanWrite(user, shift.centerId);
    return this.prisma.shift.update({
      where: { id },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      },
    });
  }
}
