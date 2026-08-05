import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoicesService } from './invoices.service';
import { FranchiseFeesService } from './franchise-fees.service';

@Injectable()
export class BillingOverdueCron {
  private readonly logger = new Logger(BillingOverdueCron.name);

  constructor(private invoices: InvoicesService, private franchiseFees: FranchiseFeesService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async run() {
    const [invoiceResult, feeResult] = await Promise.all([
      this.invoices.markOverdueInvoices(),
      this.franchiseFees.markOverdueFees(),
    ]);
    this.logger.log(
      `Marked ${invoiceResult.count} invoices and ${feeResult.count} franchise fees overdue`,
    );
  }
}
