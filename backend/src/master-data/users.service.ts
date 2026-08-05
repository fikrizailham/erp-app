import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CenterAccessService } from '../common/services/center-access.service';
import { CreateUserDto, UpdateUserDto } from './dto/master-data.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private centerAccess: CenterAccessService) {}

  async create(dto: CreateUserDto, actor: AuthenticatedUser) {
    this.assertCanManage(dto.role, actor);
    if (dto.centerIds?.length) {
      dto.centerIds.forEach((c) => this.centerAccess.assertCanWrite(actor, c));
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role,
        franchiseId: dto.role === Role.HQ_ADMIN ? dto.franchiseId ?? actor.franchiseId : null,
        guardianId: dto.role === Role.PARENT ? dto.guardianId : null,
        staffId: dto.staffId,
        centerAccess: dto.centerIds?.length
          ? { create: dto.centerIds.map((centerId) => ({ centerId })) }
          : undefined,
      },
      include: { centerAccess: true },
    });
  }

  async findAll(actor: AuthenticatedUser) {
    if (actor.role === Role.HQ_ADMIN) {
      return this.prisma.user.findMany({
        where: { franchiseId: actor.franchiseId ?? undefined },
        include: { centerAccess: true },
      });
    }
    if (actor.role === Role.CENTER_OWNER) {
      return this.prisma.user.findMany({
        where: { centerAccess: { some: { centerId: { in: actor.centerIds } } } },
        include: { centerAccess: true },
      });
    }
    throw new ForbiddenException('You cannot list users');
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthenticatedUser) {
    const target = await this.prisma.user.findUnique({ where: { id }, include: { centerAccess: true } });
    if (!target) throw new NotFoundException('User not found');
    this.assertCanManage(target.role, actor);

    if (dto.centerIds) {
      dto.centerIds.forEach((c) => this.centerAccess.assertCanWrite(actor, c));
      await this.prisma.userCenterAccess.deleteMany({ where: { userId: id } });
      await this.prisma.userCenterAccess.createMany({
        data: dto.centerIds.map((centerId) => ({ userId: id, centerId })),
      });
    }
    return this.prisma.user.update({
      where: { id },
      data: { name: dto.name, isActive: dto.isActive },
      include: { centerAccess: true },
    });
  }

  private assertCanManage(targetRole: Role, actor: AuthenticatedUser) {
    if (actor.role === Role.HQ_ADMIN) return; // HQ manages HQ Admins + oversight
    if (actor.role === Role.CENTER_OWNER && (targetRole === Role.FRONTDESK_STAFF || targetRole === Role.PARENT)) {
      return;
    }
    throw new ForbiddenException('You do not have permission to manage this user');
  }
}
