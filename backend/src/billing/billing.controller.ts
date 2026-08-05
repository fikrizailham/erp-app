import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoiceStatus, Role } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { PaymentsService } from './payments.service';
import { FranchiseFeesService } from './franchise-fees.service';
import {
  CreateFranchiseFeeDto,
  CreateInvoiceDto,
  RecordPaymentDto,
  UpdateFranchiseFeeStatusDto,
  UploadPaymentProofDto,
} from './dto/billing.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';

const ALL_ROLES = [Role.HQ_ADMIN, Role.CENTER_OWNER, Role.FRONTDESK_STAFF, Role.PARENT];
const STAFF_ROLES = [Role.CENTER_OWNER, Role.FRONTDESK_STAFF];

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class BillingController {
  constructor(
    private invoices: InvoicesService,
    private payments: PaymentsService,
    private franchiseFees: FranchiseFeesService,
  ) {}

  // ── Invoices ───────────────────────────────────────────────────────
  @ApiTags('invoices')
  @Roles(...STAFF_ROLES)
  @Post('invoices')
  createInvoice(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.invoices.create(dto, user);
  }

  @ApiTags('invoices')
  @Roles(...ALL_ROLES)
  @Get('invoices')
  findInvoices(
    @Query('centerId') centerId: string,
    @Query('status') status: InvoiceStatus,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoices.findAll({ centerId, status }, user);
  }

  @ApiTags('invoices')
  @Roles(...ALL_ROLES)
  @Get('invoices/:id')
  findInvoice(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoices.findOne(id, user);
  }

  @ApiTags('invoices')
  @Roles(Role.PARENT, ...STAFF_ROLES)
  @Post('invoices/:id/payment-proof')
  uploadProof(
    @Param('id') id: string,
    @Body() dto: UploadPaymentProofDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoices.uploadPaymentProof(id, dto, user);
  }

  // ── Payments ──────────────────────────────────────────────────────
  @ApiTags('payments')
  @Roles(...STAFF_ROLES)
  @Post('payments')
  recordPayment(@Body() dto: RecordPaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.payments.record(dto, user);
  }

  @ApiTags('payments')
  @Roles(...ALL_ROLES)
  @Get('payments')
  findPayments(@Query('invoiceId') invoiceId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.payments.findAll(invoiceId, user);
  }

  // ── Franchise fees ────────────────────────────────────────────────
  @ApiTags('franchise-fees')
  @Roles(Role.HQ_ADMIN)
  @Post('franchise-fees')
  createFranchiseFee(@Body() dto: CreateFranchiseFeeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.franchiseFees.create(dto, user);
  }

  @ApiTags('franchise-fees')
  @Roles(Role.HQ_ADMIN, ...STAFF_ROLES)
  @Get('franchise-fees')
  findFranchiseFees(@Query('centerId') centerId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.franchiseFees.findAll(centerId, user);
  }

  @ApiTags('franchise-fees')
  @Roles(Role.HQ_ADMIN, Role.CENTER_OWNER)
  @Patch('franchise-fees/:id')
  updateFranchiseFeeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateFranchiseFeeStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.franchiseFees.updateStatus(id, dto, user);
  }
}
