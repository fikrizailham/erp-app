import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FranchiseFeeStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CenterAccessService } from '../common/services/center-access.service';
import { CreateFranchiseFeeDto, UpdateFranchiseFeeStatusDto } from './dto/billing.dto';

@Injectable()
export class FranchiseFeesService {
  constructor(private prisma: PrismaService, private centerAccess: CenterAccessService) {}

  async create(dto: CreateFranchiseFeeDto, user: AuthenticatedUser) {
    if (user.role !== Role.HQ_ADMIN) {
      throw new ForbiddenException('Only HQ Admin manages franchise fee billing');
    }
    const center = await this.prisma.center.findUnique({ where: { id: dto.centerId } });
    if (!center || center.franchiseId !== user.franchiseId) {
      throw new ForbiddenException('Center is not part of your franchise');
    }
    return this.prisma.franchiseFee.create({
      data: { ...dto, dueDate: new Date(dto.dueDate) },
    });
  }

  async findAll(centerId: string | undefined, user: AuthenticatedUser) {
    const where: Record<string, unknown> = {};
    if (centerId) {
      this.centerAccess.assertCanRead(user, centerId);
      where.centerId = centerId;
    } else {
      Object.assign(where, this.centerAccess.centerWhereClause(user));
    }
    return this.prisma.franchiseFee.findMany({ where, orderBy: { period: 'desc' } });
  }

  async updateStatus(id: string, dto: UpdateFranchiseFeeStatusDto, user: AuthenticatedUser) {
    const fee = await this.prisma.franchiseFee.findUnique({ where: { id } });
    if (!fee) throw new NotFoundException('Franchise fee not found');
    // HQ confirms receipt; the Center Owner can mark their own fee as paid once transferred.
    if (user.role !== Role.HQ_ADMIN) {
      this.centerAccess.assertCanWrite(user, fee.centerId);
    }
    return this.prisma.franchiseFee.update({
      where: { id },
      data: {
        status: dto.status,
        paidAt: dto.status === FranchiseFeeStatus.PAID ? new Date() : null,
      },
    });
  }

  /** Runs daily — flips past-due, unpaid franchise fees to OVERDUE. */
  async markOverdueFees() {
    return this.prisma.franchiseFee.updateMany({
      where: { status: FranchiseFeeStatus.UNPAID, dueDate: { lt: new Date() } },
      data: { status: FranchiseFeeStatus.OVERDUE },
    });
  }
}
