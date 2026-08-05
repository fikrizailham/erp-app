import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CreateRateTableDto, UpdateRateTableDto } from './dto/staff.dto';

// Statutory rate tables (BPJS, PPh21) are franchise-wide configuration, not
// hardcoded logic — validate against current Indonesian regulations before
// go-live, then update via this service rather than editing code.
@Injectable()
export class RateTablesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateRateTableDto, user: AuthenticatedUser) {
    this.assertHqAdmin(user);
    return this.prisma.payrollRateTable.create({
      data: { ...dto, franchiseId: user.franchiseId!, effectiveDate: new Date(dto.effectiveDate) },
    });
  }

  findAll(user: AuthenticatedUser) {
    const franchiseId =
      user.role === Role.HQ_ADMIN ? user.franchiseId : undefined; // others read via payroll breakdown only
    if (!franchiseId) throw new ForbiddenException('Only HQ Admin manages rate tables');
    return this.prisma.payrollRateTable.findMany({
      where: { franchiseId },
      orderBy: [{ type: 'asc' }, { effectiveDate: 'desc' }],
    });
  }

  update(id: string, dto: UpdateRateTableDto, user: AuthenticatedUser) {
    this.assertHqAdmin(user);
    return this.prisma.payrollRateTable.update({ where: { id }, data: dto });
  }

  private assertHqAdmin(user: AuthenticatedUser) {
    if (user.role !== Role.HQ_ADMIN) {
      throw new ForbiddenException('Only HQ Admin manages statutory rate tables');
    }
  }
}
