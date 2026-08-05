import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CenterAccessService } from '../common/services/center-access.service';
import { RecordPaymentDto } from './dto/billing.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService, private centerAccess: CenterAccessService) {}

  async record(dto: RecordPaymentDto, user: AuthenticatedUser) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.invoiceId },
      include: { payments: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    this.centerAccess.assertCanWrite(user, invoice.centerId);

    const payment = await this.prisma.payment.create({
      data: {
        invoiceId: dto.invoiceId,
        amount: dto.amount,
        referenceNo: dto.referenceNo,
        reconciledById: user.id,
        reconciledAt: new Date(),
      },
    });

    const totalPaid =
      invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0) + dto.amount;
    if (totalPaid >= Number(invoice.total)) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.PAID },
      });
    }

    return payment;
  }

  async findAll(invoiceId: string, user: AuthenticatedUser) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (user.role !== 'HQ_ADMIN' && user.role !== 'PARENT') {
      this.centerAccess.assertCanRead(user, invoice.centerId);
    } else if (user.role === 'PARENT' && invoice.billingGuardianId !== user.guardianId) {
      throw new NotFoundException('Invoice not found');
    }
    return this.prisma.payment.findMany({ where: { invoiceId }, orderBy: { createdAt: 'desc' } });
  }
}
