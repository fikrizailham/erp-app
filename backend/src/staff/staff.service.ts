import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CenterAccessService } from '../common/services/center-access.service';
import { CreateStaffDto, UpdateStaffDto } from './dto/staff.dto';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService, private centerAccess: CenterAccessService) {}

  create(dto: CreateStaffDto, user: AuthenticatedUser) {
    this.centerAccess.assertCanWrite(user, dto.centerId);
    return this.prisma.staff.create({ data: dto as any });
  }

  async findAll(centerId: string | undefined, user: AuthenticatedUser) {
    const where: Record<string, unknown> = {};
    if (centerId) {
      this.centerAccess.assertCanRead(user, centerId);
      where.centerId = centerId;
    } else {
      Object.assign(where, this.centerAccess.centerWhereClause(user));
    }
    return this.prisma.staff.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: { certifications: true, shifts: { orderBy: { date: 'desc' }, take: 30 } },
    });
    if (!staff) throw new NotFoundException('Staff not found');
    this.centerAccess.assertCanRead(user, staff.centerId);
    return staff;
  }

  async update(id: string, dto: UpdateStaffDto, user: AuthenticatedUser) {
    const staff = await this.prisma.staff.findUnique({ where: { id } });
    if (!staff) throw new NotFoundException('Staff not found');
    this.centerAccess.assertCanWrite(user, staff.centerId);
    return this.prisma.staff.update({ where: { id }, data: dto as any });
  }
}
