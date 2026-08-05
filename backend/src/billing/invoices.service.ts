import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CenterAccessService } from '../common/services/center-access.service';
import { CreateInvoiceDto, UploadPaymentProofDto } from './dto/billing.dto';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService, private centerAccess: CenterAccessService) {}

  async create(dto: CreateInvoiceDto, user: AuthenticatedUser) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id: dto.enrollmentId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    this.centerAccess.assertCanWrite(user, enrollment.centerId);

    const lineItems = dto.lineItems.map((li) => ({
      ...li,
      amount: Number((li.quantity * li.unitPrice).toFixed(2)),
    }));
    const total = Number(lineItems.reduce((sum, li) => sum + li.amount, 0).toFixed(2));

    return this.prisma.invoice.create({
      data: {
        enrollmentId: dto.enrollmentId,
        centerId: enrollment.centerId,
        billingGuardianId: enrollment.billingGuardianId,
        period: dto.period,
        lineItems,
        total,
        dueDate: new Date(dto.dueDate),
      },
    });
  }

  async findAll(
    filters: { centerId?: string; status?: InvoiceStatus },
    user: AuthenticatedUser,
  ) {
    if (user.role === Role.PARENT) {
      if (!user.guardianId) return [];
      return this.prisma.invoice.findMany({
        where: { billingGuardianId: user.guardianId, status: filters.status },
        include: { payments: true },
        orderBy: { dueDate: 'desc' },
      });
    }
    const where: Record<string, unknown> = { status: filters.status };
    if (filters.centerId) {
      this.centerAccess.assertCanRead(user, filters.centerId);
      where.centerId = filters.centerId;
    } else {
      Object.assign(where, this.centerAccess.centerWhereClause(user));
    }
    return this.prisma.invoice.findMany({
      where,
      include: { payments: true, billingGuardian: true },
      orderBy: { dueDate: 'desc' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { payments: true, enrollment: { include: { child: true } }, billingGuardian: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (user.role === Role.PARENT) {
      if (invoice.billingGuardianId !== user.guardianId) throw new NotFoundException('Invoice not found');
    } else {
      this.centerAccess.assertCanRead(user, invoice.centerId);
    }
    return invoice;
  }

  async uploadPaymentProof(id: string, dto: UploadPaymentProofDto, user: AuthenticatedUser) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (user.role === Role.PARENT && invoice.billingGuardianId !== user.guardianId) {
      throw new ForbiddenException('Not your invoice');
    }
    return this.prisma.invoice.update({
      where: { id },
      data: { paymentProofUrl: dto.paymentProofUrl },
    });
  }

  /** Runs daily via a scheduled job — flips past-due, unpaid invoices to OVERDUE. */
  async markOverdueInvoices() {
    return this.prisma.invoice.updateMany({
      where: { status: InvoiceStatus.UNPAID, dueDate: { lt: new Date() } },
      data: { status: InvoiceStatus.OVERDUE },
    });
  }
}
