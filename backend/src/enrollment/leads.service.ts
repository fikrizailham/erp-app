import { Injectable, NotFoundException } from '@nestjs/common';
import { LeadStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CenterAccessService } from '../common/services/center-access.service';
import { CreateLeadDto, UpdateLeadDto } from './dto/enrollment.dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService, private centerAccess: CenterAccessService) {}

  create(dto: CreateLeadDto, user: AuthenticatedUser) {
    this.centerAccess.assertCanWrite(user, dto.centerId);
    return this.prisma.lead.create({ data: dto as any });
  }

  async findAll(centerId: string | undefined, status: LeadStatus | undefined, user: AuthenticatedUser) {
    if (user.role === Role.PARENT) {
      if (!user.guardianId) return [];
      return this.prisma.lead.findMany({ where: { guardianId: user.guardianId } });
    }
    const where: Record<string, unknown> = {};
    if (centerId) {
      this.centerAccess.assertCanRead(user, centerId);
      where.centerId = centerId;
    } else {
      const clause = this.centerAccess.centerWhereClause(user);
      Object.assign(where, clause);
    }
    if (status) where.status = status;
    return this.prisma.lead.findMany({
      where,
      orderBy: [{ status: 'asc' }, { waitlistPosition: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    if (user.role === Role.PARENT) {
      if (lead.guardianId !== user.guardianId) throw new NotFoundException('Lead not found');
    } else {
      this.centerAccess.assertCanRead(user, lead.centerId);
    }
    return lead;
  }

  async update(id: string, dto: UpdateLeadDto, user: AuthenticatedUser) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead not found');
    this.centerAccess.assertCanWrite(user, lead.centerId);

    const data: Record<string, unknown> = { ...dto };

    if (dto.status === LeadStatus.WAITLISTED && lead.status !== LeadStatus.WAITLISTED) {
      const maxPos = await this.prisma.lead.aggregate({
        where: { centerId: lead.centerId, status: LeadStatus.WAITLISTED },
        _max: { waitlistPosition: true },
      });
      data.waitlistPosition = dto.waitlistPosition ?? (maxPos._max.waitlistPosition ?? 0) + 1;
    }

    if (
      lead.status === LeadStatus.WAITLISTED &&
      dto.status &&
      dto.status !== LeadStatus.WAITLISTED &&
      lead.waitlistPosition
    ) {
      // Leaving the waitlist — close the gap for everyone behind this lead.
      await this.prisma.lead.updateMany({
        where: {
          centerId: lead.centerId,
          status: LeadStatus.WAITLISTED,
          waitlistPosition: { gt: lead.waitlistPosition },
        },
        data: { waitlistPosition: { decrement: 1 } },
      });
      data.waitlistPosition = null;
    }

    return this.prisma.lead.update({ where: { id }, data });
  }
}
