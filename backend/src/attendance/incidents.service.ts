import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CenterAccessService } from '../common/services/center-access.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateIncidentDto } from './dto/attendance.dto';

@Injectable()
export class IncidentsService {
  constructor(
    private prisma: PrismaService,
    private centerAccess: CenterAccessService,
    private notifications: NotificationsService,
  ) {}

  async create(dto: CreateIncidentDto, user: AuthenticatedUser) {
    const child = await this.prisma.child.findUnique({
      where: { id: dto.childId },
      include: { guardianLinks: { where: { portalAccessLevel: { not: 'NONE' } } } },
    });
    if (!child) throw new NotFoundException('Child not found');
    if (child.currentCenterId) this.centerAccess.assertCanWrite(user, child.currentCenterId);

    const incident = await this.prisma.incidentLog.create({
      data: {
        childId: dto.childId,
        type: dto.type,
        severity: dto.severity,
        description: dto.description,
        staffReporterId: user.id,
      },
    });

    await Promise.all(
      child.guardianLinks.map((link) =>
        this.notifications.notifyGuardian(
          link.guardianId,
          NotificationType.INCIDENT,
          `Incident report: ${child.name}`,
          `${dto.type} (${dto.severity}) — ${dto.description}`,
          { incidentId: incident.id, childId: child.id },
        ),
      ),
    );

    if (child.guardianLinks.length > 0) {
      await this.prisma.incidentLog.update({
        where: { id: incident.id },
        data: { parentNotified: true },
      });
    }

    return incident;
  }

  async findAll(filters: { childId?: string; centerId?: string }, user: AuthenticatedUser) {
    const where: Record<string, unknown> = {};
    if (user.role === Role.PARENT) {
      if (!user.guardianId) return [];
      where.child = { guardianLinks: { some: { guardianId: user.guardianId } } };
    } else if (filters.centerId) {
      this.centerAccess.assertCanRead(user, filters.centerId);
      where.child = { currentCenterId: filters.centerId };
    } else {
      const scope = this.centerAccess.scopeForRead(user);
      if (scope !== 'ALL') where.child = { currentCenterId: { in: scope } };
    }
    if (filters.childId) where.childId = filters.childId;
    return this.prisma.incidentLog.findMany({
      where,
      include: { child: true, staffReporter: true },
      orderBy: { timestamp: 'desc' },
    });
  }

  async acknowledge(id: string, user: AuthenticatedUser) {
    const incident = await this.prisma.incidentLog.findUnique({
      where: { id },
      include: { child: { include: { guardianLinks: true } } },
    });
    if (!incident) throw new NotFoundException('Incident not found');
    if (user.role === Role.PARENT) {
      const linked = incident.child.guardianLinks.some((l) => l.guardianId === user.guardianId);
      if (!linked) throw new ForbiddenException('Not your child');
    }
    return this.prisma.incidentLog.update({
      where: { id },
      data: { parentAck: true, parentAckAt: new Date() },
    });
  }
}
