import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { InvoicesService } from './invoices.service';
import { PaymentsService } from './payments.service';
import { FranchiseFeesService } from './franchise-fees.service';
import { BillingOverdueCron } from './billing-overdue.cron';

@Module({
  controllers: [BillingController],
  providers: [InvoicesService, PaymentsService, FranchiseFeesService, BillingOverdueCron],
  exports: [InvoicesService, PaymentsService, FranchiseFeesService],
})
export class BillingModule {}
