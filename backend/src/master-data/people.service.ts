import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CenterAccessService } from '../common/services/center-access.service';
import {
  CreateChildDto,
  CreateGuardianChildLinkDto,
  CreateGuardianDto,
  UpdateChildDto,
  UpdateGuardianChildLinkDto,
  UpdateGuardianDto,
} from './dto/master-data.dto';

const STAFF_ROLES: Role[] = [Role.CENTER_OWNER, Role.FRONTDESK_STAFF];

@Injectable()
export class PeopleService {
  constructor(private prisma: PrismaService, private centerAccess: CenterAccessService) {}

  // ── Guardians (global) ────────────────────────────────────────────────
  createGuardian(dto: CreateGuardianDto, user: AuthenticatedUser) {
    this.assertStaff(user);
    return this.prisma.guardian.create({ data: dto as any });
  }

  async findGuardians(search: string | undefined, user: AuthenticatedUser) {
    if (user.role === Role.PARENT) {
      if (!user.guardianId) return [];
      const self = await this.prisma.guardian.findUnique({ where: { id: user.guardianId } });
      return self ? [self] : [];
    }
    return this.prisma.guardian.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  async findGuardian(id: string, user: AuthenticatedUser) {
    this.assertCanAccessGuardian(id, user);
    const guardian = await this.prisma.guardian.findUnique({
      where: { id },
      include: { childLinks: { include: { child: true } } },
    });
    if (!guardian) throw new NotFoundException('Guardian not found');
    return guardian;
  }

  async updateGuardian(id: string, dto: UpdateGuardianDto, user: AuthenticatedUser) {
    this.assertStaff(user);
    return this.prisma.guardian.update({ where: { id }, data: dto as any });
  }

  // ── Children (global record, center-scoped visibility) ─────────────────
  async createChild(dto: CreateChildDto, user: AuthenticatedUser) {
    this.assertStaff(user);
    if (dto.currentCenterId) this.centerAccess.assertCanWrite(user, dto.currentCenterId);
    return this.prisma.child.create({ data: dto as any });
  }

  async findChildren(centerId: string | undefined, user: AuthenticatedUser) {
    if (user.role === Role.PARENT) {
      if (!user.guardianId) return [];
      return this.prisma.child.findMany({
        where: { guardianLinks: { some: { guardianId: user.guardianId } } },
      });
    }
    const where: Record<string, unknown> = {};
    if (centerId) {
      this.centerAccess.assertCanRead(user, centerId);
      where.currentCenterId = centerId;
    } else {
      const scope = this.centerAccess.scopeForRead(user);
      if (scope !== 'ALL') where.currentCenterId = { in: scope };
    }
    return this.prisma.child.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findChild(id: string, user: AuthenticatedUser) {
    const child = await this.prisma.child.findUnique({
      where: { id },
      include: { guardianLinks: { include: { guardian: true } } },
    });
    if (!child) throw new NotFoundException('Child not found');
    await this.assertCanAccessChild(child, user);
    return child;
  }

  async updateChild(id: string, dto: UpdateChildDto, user: AuthenticatedUser) {
    this.assertStaff(user);
    const child = await this.prisma.child.findUnique({ where: { id } });
    if (!child) throw new NotFoundException('Child not found');
    if (child.currentCenterId) this.centerAccess.assertCanWrite(user, child.currentCenterId);
    if (dto.currentCenterId) this.centerAccess.assertCanWrite(user, dto.currentCenterId);
    return this.prisma.child.update({ where: { id }, data: dto as any });
  }

  // ── GuardianChildLink ────────────────────────────────────────────────
  async createLink(dto: CreateGuardianChildLinkDto, user: AuthenticatedUser) {
    this.assertStaff(user);
    const child = await this.prisma.child.findUnique({ where: { id: dto.childId } });
    if (!child) throw new NotFoundException('Child not found');
    if (child.currentCenterId) this.centerAccess.assertCanWrite(user, child.currentCenterId);

    if (dto.isBillingGuardian) {
      await this.prisma.guardianChildLink.updateMany({
        where: { childId: dto.childId },
        data: { isBillingGuardian: false },
      });
    }
    return this.prisma.guardianChildLink.create({ data: dto });
  }

  async updateLink(id: string, dto: UpdateGuardianChildLinkDto, user: AuthenticatedUser) {
    this.assertStaff(user);
    const link = await this.prisma.guardianChildLink.findUnique({
      where: { id },
      include: { child: true },
    });
    if (!link) throw new NotFoundException('Link not found');
    if (link.child.currentCenterId) this.centerAccess.assertCanWrite(user, link.child.currentCenterId);

    if (dto.isBillingGuardian) {
      await this.prisma.guardianChildLink.updateMany({
        where: { childId: link.childId, id: { not: id } },
        data: { isBillingGuardian: false },
      });
    }
    return this.prisma.guardianChildLink.update({ where: { id }, data: dto });
  }

  // ── access helpers ───────────────────────────────────────────────────
  private assertStaff(user: AuthenticatedUser) {
    if (!STAFF_ROLES.includes(user.role)) {
      throw new ForbiddenException('Only Center Owner / Front-desk staff may manage this record');
    }
  }

  private async assertCanAccessGuardian(guardianId: string, user: AuthenticatedUser) {
    if (STAFF_ROLES.includes(user.role) || user.role === Role.HQ_ADMIN) return;
    if (user.role === Role.PARENT && user.guardianId === guardianId) return;
    throw new ForbiddenException('You do not have access to this guardian record');
  }

  private async assertCanAccessChild(
    child: { currentCenterId: string | null; guardianLinks: { guardianId: string }[] },
    user: AuthenticatedUser,
  ) {
    if (user.role === Role.PARENT) {
      const linked = child.guardianLinks.some((l) => l.guardianId === user.guardianId);
      if (!linked) throw new ForbiddenException('You do not have access to this child');
      return;
    }
    if (child.currentCenterId) {
      this.centerAccess.assertCanRead(user, child.currentCenterId);
    }
  }
}
