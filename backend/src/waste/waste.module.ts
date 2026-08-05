import { Module } from '@nestjs/common';
import { WasteService } from './waste.service';
import { WasteController } from './waste.controller';
import { AccountingModule } from '../accounting/accounting.module';

@Module({
  imports: [AccountingModule],
  providers: [WasteService],
  controllers: [WasteController],
  exports: [WasteService],
})
export class WasteModule {}
