import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CheckMethod, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CenterAccessService } from '../common/services/center-access.service';
import { CheckInDto, CheckOutDto } from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService, private centerAccess: CenterAccessService) {}

  async checkIn(dto: CheckInDto, user: AuthenticatedUser) {
    const child = await this.assertAccess(dto.childId, user);
    if (!child.currentCenterId) {
      throw new BadRequestException('Child has no assigned center — enroll them first');
    }
    const open = await this.prisma.attendanceRecord.findFirst({
      where: { childId: dto.childId, checkOutTime: null },
    });
    if (open) throw new BadRequestException('Child is already checked in');

    return this.prisma.attendanceRecord.create({
      data: {
        childId: dto.childId,
        centerId: child.currentCenterId,
        checkInTime: new Date(),
        checkInMethod: user.role === Role.PARENT ? CheckMethod.SELF : CheckMethod.FRONTDESK,
      },
    });
  }

  async checkOut(dto: CheckOutDto, user: AuthenticatedUser) {
    await this.assertAccess(dto.childId, user);
    const open = await this.prisma.attendanceRecord.findFirst({
      where: { childId: dto.childId, checkOutTime: null },
      orderBy: { checkInTime: 'desc' },
    });
    if (!open) throw new BadRequestException('Child is not currently checked in');

    return this.prisma.attendanceRecord.update({
      where: { id: open.id },
      data: {
        checkOutTime: new Date(),
        checkOutMethod: user.role === Role.PARENT ? CheckMethod.SELF : CheckMethod.FRONTDESK,
      },
    });
  }

  async findAll(
    filters: { centerId?: string; childId?: string; date?: string },
    user: AuthenticatedUser,
  ) {
    const where: Record<string, unknown> = {};
    if (user.role === Role.PARENT) {
      if (!user.guardianId) return [];
      where.child = { guardianLinks: { some: { guardianId: user.guardianId } } };
    } else if (filters.centerId) {
      this.centerAccess.assertCanRead(user, filters.centerId);
      where.centerId = filters.centerId;
    } else {
      Object.assign(where, this.centerAccess.centerWhereClause(user));
    }
    if (filters.childId) where.childId = filters.childId;
    if (filters.date) {
      const start = new Date(filters.date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.checkInTime = { gte: start, lt: end };
    }
    return this.prisma.attendanceRecord.findMany({
      where,
      include: { child: true },
      orderBy: { checkInTime: 'desc' },
    });
  }

  /** Headcount report — no ratio enforcement, just counts, per the blueprint. */
  async headcount(centerId: string, user: AuthenticatedUser) {
    this.centerAccess.assertCanRead(user, centerId);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [checkedIn, total] = await Promise.all([
      this.prisma.attendanceRecord.count({
        where: { centerId, checkInTime: { gte: start }, checkOutTime: null },
      }),
      this.prisma.attendanceRecord.count({ where: { centerId, checkInTime: { gte: start } } }),
    ]);
    return { centerId, date: start.toISOString().slice(0, 10), currentlyPresent: checkedIn, totalToday: total };
  }

  private async assertAccess(childId: string, user: AuthenticatedUser) {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      include: { guardianLinks: true },
    });
    if (!child) throw new NotFoundException('Child not found');
    if (user.role === Role.PARENT) {
      const linked = child.guardianLinks.some((l) => l.guardianId === user.guardianId);
      if (!linked) throw new ForbiddenException('Not your child');
    } else if (child.currentCenterId) {
      this.centerAccess.assertCanWrite(user, child.currentCenterId);
    }
    return child;
  }
}
