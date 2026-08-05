import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PayrollRateType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CenterAccessService } from '../common/services/center-access.service';
import { RunPayrollDto } from './dto/staff.dto';

// A configurable assumption for converting a monthly salary into an hourly
// rate — NOT a statutory rate, just the divisor used for overtime pricing.
// Adjust here if the franchise's standard working hours differ.
const STANDARD_MONTHLY_HOURS = 173;
const STANDARD_SHIFT_HOURS = 8;

@Injectable()
export class PayrollService {
  constructor(private prisma: PrismaService, private centerAccess: CenterAccessService) {}

  async run(dto: RunPayrollDto, user: AuthenticatedUser) {
    this.centerAccess.assertPayrollAccess(user);

    const staff = await this.prisma.staff.findUnique({ where: { id: dto.staffId } });
    if (!staff) throw new NotFoundException('Staff not found');
    this.centerAccess.assertCanWrite(user, staff.centerId);

    const franchiseId = await this.franchiseIdForCenter(staff.centerId);
    const { start, end } = this.periodRange(dto.period);

    const shifts = await this.prisma.shift.findMany({
      where: { staffId: dto.staffId, date: { gte: start, lt: end } },
    });

    let regularHours = 0;
    let overtimeHours = 0;
    for (const shift of shifts) {
      const hours = (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60);
      if (hours > STANDARD_SHIFT_HOURS) {
        regularHours += STANDARD_SHIFT_HOURS;
        overtimeHours += hours - STANDARD_SHIFT_HOURS;
      } else {
        regularHours += hours;
      }
    }

    const baseSalary = Number(staff.baseSalary);
    const rateTables = await this.prisma.payrollRateTable.findMany({
      where: { franchiseId, isActive: true, effectiveDate: { lte: end } },
      orderBy: { effectiveDate: 'desc' },
    });

    const overtimeRate = rateTables.find((r) => r.type === PayrollRateType.OVERTIME_MULTIPLIER);
    const overtimeMultiplier = overtimeRate ? Number(overtimeRate.rate) : 1;
    const hourlyRate = baseSalary / STANDARD_MONTHLY_HOURS;
    const overtimePay = Number((overtimeHours * hourlyRate * overtimeMultiplier).toFixed(2));

    const grossIncome = baseSalary + overtimePay;

    const bpjsTables = rateTables.filter(
      (r) => r.type === PayrollRateType.BPJS_HEALTH || r.type === PayrollRateType.BPJS_EMPLOYMENT,
    );
    const bpjsDeduction = Number(
      bpjsTables
        .reduce((sum, r) => {
          const cap = r.maxIncome ? Math.min(grossIncome, Number(r.maxIncome)) : grossIncome;
          return sum + cap * Number(r.rate);
        }, 0)
        .toFixed(2),
    );

    const taxableIncome = Math.max(0, grossIncome - bpjsDeduction);
    const pph21Brackets = rateTables
      .filter((r) => r.type === PayrollRateType.PPH21_BRACKET)
      .sort((a, b) => Number(a.minIncome ?? 0) - Number(b.minIncome ?? 0));

    let pph21Tax = 0;
    for (const bracket of pph21Brackets) {
      const min = Number(bracket.minIncome ?? 0);
      const max = bracket.maxIncome ? Number(bracket.maxIncome) : Infinity;
      if (taxableIncome <= min) continue;
      const portion = Math.min(taxableIncome, max) - min;
      if (portion > 0) pph21Tax += portion * Number(bracket.rate);
    }
    pph21Tax = Number(pph21Tax.toFixed(2));

    const netPay = Number((grossIncome - bpjsDeduction - pph21Tax).toFixed(2));

    const breakdown = {
      regularHours: Number(regularHours.toFixed(2)),
      overtimeHours: Number(overtimeHours.toFixed(2)),
      hourlyRate: Number(hourlyRate.toFixed(2)),
      overtimeMultiplier,
      grossIncome,
      taxableIncome,
      rateTablesApplied: rateTables.map((r) => ({ id: r.id, type: r.type, rate: r.rate.toString() })),
    };

    return this.prisma.payrollRecord.upsert({
      where: { staffId_period: { staffId: dto.staffId, period: dto.period } },
      create: {
        staffId: dto.staffId,
        period: dto.period,
        baseSalary,
        overtimeHours,
        overtimePay,
        bpjsDeduction,
        pph21Tax,
        netPay,
        breakdown,
      },
      update: {
        baseSalary,
        overtimeHours,
        overtimePay,
        bpjsDeduction,
        pph21Tax,
        netPay,
        breakdown,
        computedAt: new Date(),
      },
    });
  }

  async findAll(filters: { staffId?: string; centerId?: string }, user: AuthenticatedUser) {
    this.centerAccess.assertPayrollAccess(user);
    const where: Record<string, unknown> = {};
    if (filters.staffId) where.staffId = filters.staffId;
    if (filters.centerId) {
      this.centerAccess.assertCanRead(user, filters.centerId);
      where.staff = { centerId: filters.centerId };
    } else {
      const scope = this.centerAccess.scopeForRead(user);
      if (scope !== 'ALL') where.staff = { centerId: { in: scope } };
    }
    return this.prisma.payrollRecord.findMany({
      where,
      include: { staff: true },
      orderBy: { period: 'desc' },
    });
  }

  private async franchiseIdForCenter(centerId: string): Promise<string> {
    const center = await this.prisma.center.findUnique({ where: { id: centerId } });
    if (!center) throw new NotFoundException('Center not found');
    return center.franchiseId;
  }

  private periodRange(period: string): { start: Date; end: Date } {
    const match = /^(\d{4})-(\d{2})$/.exec(period);
    if (!match) throw new BadRequestException('period must be in YYYY-MM format');
    const year = Number(match[1]);
    const month = Number(match[2]);
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    return { start, end };
  }
}
