import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('accounting')
@Controller('accounting')
export class AccountingController {
  constructor(private service: AccountingService) {}

  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @Post('accounts')
  createAccount(@Body() dto: CreateAccountDto) {
    return this.service.createAccount(dto);
  }

  @Get('accounts')
  findAccounts() {
    return this.service.findAccounts();
  }

  @Get('journal-entries')
  findJournalEntries(@Query('sourceType') sourceType?: string) {
    return this.service.findJournalEntries(sourceType);
  }

  @Get('reports/profit-and-loss')
  profitAndLoss(@Query('from') from: string, @Query('to') to: string) {
    return this.service.profitAndLoss(new Date(from), new Date(to));
  }

  @Get('reports/balance-sheet')
  balanceSheet(@Query('asOf') asOf: string) {
    return this.service.balanceSheet(new Date(asOf));
  }

  @Get('reports/cash-flow')
  cashFlow(@Query('from') from: string, @Query('to') to: string) {
    return this.service.cashFlow(new Date(from), new Date(to));
  }

  @Get('reports/product-profitability')
  productProfitability(@Query('from') from: string, @Query('to') to: string) {
    return this.service.productProfitability(new Date(from), new Date(to));
  }
}
