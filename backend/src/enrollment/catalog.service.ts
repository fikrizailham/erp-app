import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CenterAccessService } from '../common/services/center-access.service';
import {
  CreateAddOnServiceDto,
  CreateProgramDto,
  UpdateAddOnServiceDto,
  UpdateProgramDto,
} from './dto/enrollment.dto';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService, private centerAccess: CenterAccessService) {}

  // ── Programs (center-scoped) ────────────────────────────────────────
  createProgram(dto: CreateProgramDto, user: AuthenticatedUser) {
    this.centerAccess.assertCanWrite(user, dto.centerId);
    return this.prisma.program.create({ data: dto as any });
  }

  async findPrograms(centerId: string | undefined, user: AuthenticatedUser) {
    const where: Record<string, unknown> = {};
    if (centerId) {
      this.centerAccess.assertCanRead(user, centerId);
      where.centerId = centerId;
    } else {
      Object.assign(where, this.centerAccess.centerWhereClause(user));
    }
    return this.prisma.program.findMany({ where, orderBy: { name: 'asc' } });
  }

  async updateProgram(id: string, dto: UpdateProgramDto, user: AuthenticatedUser) {
    const program = await this.prisma.program.findUnique({ where: { id } });
    if (!program) throw new NotFoundException('Program not found');
    this.centerAccess.assertCanWrite(user, program.centerId);
    return this.prisma.program.update({ where: { id }, data: dto as any });
  }

  // ── Add-on services (shared catalog across the franchise) ──────────
  createAddOn(dto: CreateAddOnServiceDto, user: AuthenticatedUser) {
    if (user.role !== Role.HQ_ADMIN && user.role !== Role.CENTER_OWNER) {
      throw new ForbiddenException('Only HQ Admin or a Center Owner may manage the add-on catalog');
    }
    return this.prisma.addOnService.create({ data: dto });
  }

  findAddOns() {
    return this.prisma.addOnService.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  updateAddOn(id: string, dto: UpdateAddOnServiceDto, user: AuthenticatedUser) {
    if (user.role !== Role.HQ_ADMIN && user.role !== Role.CENTER_OWNER) {
      throw new ForbiddenException('Only HQ Admin or a Center Owner may manage the add-on catalog');
    }
    return this.prisma.addOnService.update({ where: { id }, data: dto });
  }
}
