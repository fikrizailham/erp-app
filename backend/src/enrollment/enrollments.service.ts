import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CenterAccessService } from '../common/services/center-access.service';
import { CreateEnrollmentDto, UpdateEnrollmentDto } from './dto/enrollment.dto';

@Injectable()
export class EnrollmentsService {
  constructor(private prisma: PrismaService, private centerAccess: CenterAccessService) {}

  async create(dto: CreateEnrollmentDto, user: AuthenticatedUser) {
    this.centerAccess.assertCanWrite(user, dto.centerId);
    const enrollment = await this.prisma.enrollment.create({ data: dto as any });
    // Keep the child's "home center" in sync with their active enrollment.
    await this.prisma.child.update({
      where: { id: dto.childId },
      data: { currentCenterId: dto.centerId },
    });
    return enrollment;
  }

  async findAll(centerId: string | undefined, user: AuthenticatedUser) {
    if (user.role === Role.PARENT) {
      if (!user.guardianId) return [];
      return this.prisma.enrollment.findMany({
        where: { child: { guardianLinks: { some: { guardianId: user.guardianId } } } },
        include: { child: true, program: true },
      });
    }
    const where: Record<string, unknown> = {};
    if (centerId) {
      this.centerAccess.assertCanRead(user, centerId);
      where.centerId = centerId;
    } else {
      Object.assign(where, this.centerAccess.centerWhereClause(user));
    }
    return this.prisma.enrollment.findMany({
      where,
      include: { child: true, program: true, billingGuardian: true },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: { child: { include: { guardianLinks: true } }, program: true, billingGuardian: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    if (user.role === Role.PARENT) {
      const allowed = enrollment.child.guardianLinks.some((l) => l.guardianId === user.guardianId);
      if (!allowed) throw new NotFoundException('Enrollment not found');
    } else {
      this.centerAccess.assertCanRead(user, enrollment.centerId);
    }
    return enrollment;
  }

  async update(id: string, dto: UpdateEnrollmentDto, user: AuthenticatedUser) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    this.centerAccess.assertCanWrite(user, enrollment.centerId);
    return this.prisma.enrollment.update({ where: { id }, data: dto as any });
  }
}
