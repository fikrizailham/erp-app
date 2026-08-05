import { Module } from '@nestjs/common';
import { PurchasingService } from './purchasing.service';
import { PurchasingController } from './purchasing.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  providers: [PurchasingService],
  controllers: [PurchasingController],
  exports: [PurchasingService],
})
export class PurchasingModule {}
