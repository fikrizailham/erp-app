import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CenterAccessService } from '../common/services/center-access.service';
import { CreateCenterDto, UpdateCenterDto } from './dto/master-data.dto';

@Injectable()
export class CentersService {
  constructor(private prisma: PrismaService, private centerAccess: CenterAccessService) {}

  create(dto: CreateCenterDto, user: AuthenticatedUser) {
    if (user.role !== Role.HQ_ADMIN) {
      throw new ForbiddenException('Only HQ Admin can onboard a new center');
    }
    if (user.franchiseId !== dto.franchiseId) {
      throw new ForbiddenException('Cannot create a center outside your franchise');
    }
    return this.prisma.center.create({ data: dto });
  }

  async findAll(user: AuthenticatedUser) {
    const where =
      user.role === Role.HQ_ADMIN
        ? { franchiseId: user.franchiseId ?? undefined }
        : { id: { in: user.centerIds } };
    return this.prisma.center.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    this.centerAccess.assertCanRead(user, id);
    const center = await this.prisma.center.findUnique({ where: { id } });
    if (!center) throw new NotFoundException('Center not found');
    return center;
  }

  async update(id: string, dto: UpdateCenterDto, user: AuthenticatedUser) {
    if (user.role !== Role.CENTER_OWNER) {
      throw new ForbiddenException('Only the Center Owner can edit center details');
    }
    this.centerAccess.assertCanWrite(user, id);
    return this.prisma.center.update({ where: { id }, data: dto });
  }
}
