import { ForbiddenException, Injectable } from '@nestjs/common';
import { InvoiceStatus, LeadStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CenterAccessService } from '../common/services/center-access.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService, private centerAccess: CenterAccessService) {}

  // ── Financial: revenue + AR aging ───────────────────────────────────
  async financial(centerId: string | undefined, user: AuthenticatedUser) {
    const where = this.centerScope(centerId, user);

    const [paidInvoices, openInvoices] = await Promise.all([
      this.prisma.invoice.findMany({ where: { ...where, status: InvoiceStatus.PAID } }),
      this.prisma.invoice.findMany({
        where: { ...where, status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE] } },
      }),
    ]);

    const revenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);
    const now = Date.now();
    const aging = { current: 0, days1to30: 0, days31to60: 0, days60plus: 0 };
    for (const inv of openInvoices) {
      const daysPastDue = Math.max(0, Math.floor((now - inv.dueDate.getTime()) / 86_400_000));
      const amount = Number(inv.total);
      if (daysPastDue <= 0) aging.current += amount;
      else if (daysPastDue <= 30) aging.days1to30 += amount;
      else if (daysPastDue <= 60) aging.days31to60 += amount;
      else aging.days60plus += amount;
    }

    return {
      revenue: Number(revenue.toFixed(2)),
      invoiceCount: { paid: paidInvoices.length, outstanding: openInvoices.length },
      arAging: this.roundAll(aging),
      collectionsRate:
        paidInvoices.length + openInvoices.length > 0
          ? Number((paidInvoices.length / (paidInvoices.length + openInvoices.length)).toFixed(3))
          : null,
    };
  }

  // ── Operational: enrollment + attendance trends ─────────────────────
  async operational(centerId: string | undefined, user: AuthenticatedUser) {
    const where = this.centerScope(centerId, user);

    const [byStatus, leadsByStatus, last14Days] = await Promise.all([
      this.prisma.enrollment.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: centerId ? { centerId } : this.centerAccess.centerWhereClause(user),
        _count: true,
      }),
      this.attendanceTrend(centerId),
    ]);

    return {
      enrollmentByStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count])),
      leadsByStatus: Object.fromEntries(leadsByStatus.map((r) => [r.status, r._count])),
      attendanceTrend: last14Days,
    };
  }

  // ── Staff: headcount, cert alerts, payroll totals ───────────────────
  async staff(centerId: string | undefined, user: AuthenticatedUser) {
    const where = this.centerScope(centerId, user);
    const [staffCount, expiringCerts, payrollRecords] = await Promise.all([
      this.prisma.staff.count({ where: { ...where, isActive: true } }),
      this.prisma.certification.count({
        where: { alertStatus: { in: ['EXPIRING_SOON', 'EXPIRED'] }, staff: where },
      }),
      user.role === Role.HQ_ADMIN || user.role === Role.CENTER_OWNER
        ? this.prisma.payrollRecord.findMany({ where: { staff: where }, take: 200 })
        : Promise.resolve([] as Awaited<ReturnType<typeof this.prisma.payrollRecord.findMany>>),
    ]);

    return {
      activeStaffCount: staffCount,
      certificationsNeedingAttention: expiringCerts,
      payrollTotalNetPay:
        payrollRecords.length > 0
          ? Number(payrollRecords.reduce((s, r) => s + Number(r.netPay), 0).toFixed(2))
          : null,
    };
  }

  // ── Franchise-wide rollup (HQ Admin full; Center Owner sees benchmarks only) ──
  async franchiseRollup(user: AuthenticatedUser) {
    if (user.role !== Role.HQ_ADMIN && user.role !== Role.CENTER_OWNER) {
      throw new ForbiddenException('Franchise rollup is not available for this role');
    }
    const franchiseId = user.franchiseId;
    const centers = await this.prisma.center.findMany({
      where: franchiseId ? { franchiseId } : { id: { in: user.centerIds } },
    });

    const perCenter = await Promise.all(
      centers.map(async (c) => {
        const [revenue, enrollmentCount] = await Promise.all([
          this.prisma.invoice.aggregate({
            where: { centerId: c.id, status: InvoiceStatus.PAID },
            _sum: { total: true },
          }),
          this.prisma.enrollment.count({ where: { centerId: c.id, status: 'ACTIVE' } }),
        ]);
        return {
          centerId: c.id,
          centerName: c.name,
          revenue: Number(revenue._sum.total ?? 0),
          activeEnrollments: enrollmentCount,
        };
      }),
    );

    if (user.role === Role.HQ_ADMIN) {
      return { scope: 'franchise-wide', centers: perCenter };
    }

    // Center Owner: own numbers + anonymized franchise average as a benchmark.
    const own = perCenter.filter((c) => user.centerIds.includes(c.centerId));
    const avgRevenue = perCenter.reduce((s, c) => s + c.revenue, 0) / (perCenter.length || 1);
    const avgEnrollments =
      perCenter.reduce((s, c) => s + c.activeEnrollments, 0) / (perCenter.length || 1);
    return {
      scope: 'own-center-with-benchmark',
      ownCenters: own,
      franchiseBenchmark: {
        avgRevenue: Number(avgRevenue.toFixed(2)),
        avgActiveEnrollments: Number(avgEnrollments.toFixed(1)),
        centerCount: perCenter.length,
      },
    };
  }

  // ── Parent: own child summary ───────────────────────────────────────
  async parentSummary(user: AuthenticatedUser) {
    if (user.role !== Role.PARENT || !user.guardianId) {
      throw new ForbiddenException('Only available to Parent users');
    }
    const [invoices, attendance, incidents] = await Promise.all([
      this.prisma.invoice.findMany({ where: { billingGuardianId: user.guardianId } }),
      this.prisma.attendanceRecord.findMany({
        where: { child: { guardianLinks: { some: { guardianId: user.guardianId } } } },
        orderBy: { checkInTime: 'desc' },
        take: 10,
      }),
      this.prisma.incidentLog.count({
        where: { child: { guardianLinks: { some: { guardianId: user.guardianId } } } },
      }),
    ]);
    const outstandingBalance = invoices
      .filter((i) => i.status !== InvoiceStatus.PAID)
      .reduce((s, i) => s + Number(i.total), 0);
    return {
      outstandingBalance: Number(outstandingBalance.toFixed(2)),
      recentAttendance: attendance,
      totalIncidents: incidents,
    };
  }

  private centerScope(centerId: string | undefined, user: AuthenticatedUser) {
    if (centerId) {
      this.centerAccess.assertCanRead(user, centerId);
      return { centerId };
    }
    return this.centerAccess.centerWhereClause(user);
  }

  private async attendanceTrend(centerId: string | undefined) {
    const since = new Date();
    since.setDate(since.getDate() - 14);
    const records = await this.prisma.attendanceRecord.findMany({
      where: { checkInTime: { gte: since }, ...(centerId ? { centerId } : {}) },
      select: { checkInTime: true },
    });
    const byDay = new Map<string, number>();
    for (const r of records) {
      const key = r.checkInTime.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    return Object.fromEntries([...byDay.entries()].sort());
  }

  private roundAll<T extends Record<string, number>>(obj: T): T {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Number(v.toFixed(2))])) as T;
  }
}
