import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { StaffService } from './staff.service';
import { CertificationsService } from './certifications.service';
import { ShiftsService } from './shifts.service';
import { RateTablesService } from './rate-tables.service';
import { PayrollService } from './payroll.service';
import {
  CreateCertificationDto,
  CreateRateTableDto,
  CreateShiftDto,
  CreateStaffDto,
  RunPayrollDto,
  UpdateCertificationDto,
  UpdateRateTableDto,
  UpdateShiftDto,
  UpdateStaffDto,
} from './dto/staff.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';

const ALL_ROLES = [Role.HQ_ADMIN, Role.CENTER_OWNER, Role.FRONTDESK_STAFF];
const STAFF_MGMT = [Role.CENTER_OWNER, Role.FRONTDESK_STAFF];
const PAYROLL_ROLES = [Role.HQ_ADMIN, Role.CENTER_OWNER];

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class StaffController {
  constructor(
    private staff: StaffService,
    private certifications: CertificationsService,
    private shifts: ShiftsService,
    private rateTables: RateTablesService,
    private payroll: PayrollService,
  ) {}

  // ── Staff ────────────────────────────────────────────────────────
  @ApiTags('staff')
  @Roles(Role.CENTER_OWNER)
  @Post('staff')
  createStaff(@Body() dto: CreateStaffDto, @CurrentUser() user: AuthenticatedUser) {
    return this.staff.create(dto, user);
  }

  @ApiTags('staff')
  @Roles(...ALL_ROLES)
  @Get('staff')
  findStaff(@Query('centerId') centerId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.staff.findAll(centerId, user);
  }

  @ApiTags('staff')
  @Roles(...ALL_ROLES)
  @Get('staff/:id')
  findOneStaff(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.staff.findOne(id, user);
  }

  @ApiTags('staff')
  @Roles(Role.CENTER_OWNER)
  @Patch('staff/:id')
  updateStaff(
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.staff.update(id, dto, user);
  }

  // ── Certifications ──────────────────────────────────────────────
  @ApiTags('certifications')
  @Roles(...STAFF_MGMT)
  @Post('certifications')
  createCert(@Body() dto: CreateCertificationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.certifications.create(dto, user);
  }

  @ApiTags('certifications')
  @Roles(...ALL_ROLES)
  @Get('certifications')
  findCerts(
    @Query('staffId') staffId: string,
    @Query('centerId') centerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.certifications.findAll(staffId, centerId, user);
  }

  @ApiTags('certifications')
  @Roles(...STAFF_MGMT)
  @Patch('certifications/:id')
  updateCert(
    @Param('id') id: string,
    @Body() dto: UpdateCertificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.certifications.update(id, dto, user);
  }

  // ── Shifts ──────────────────────────────────────────────────────
  @ApiTags('shifts')
  @Roles(...STAFF_MGMT)
  @Post('shifts')
  createShift(@Body() dto: CreateShiftDto, @CurrentUser() user: AuthenticatedUser) {
    return this.shifts.create(dto, user);
  }

  @ApiTags('shifts')
  @Roles(...ALL_ROLES)
  @Get('shifts')
  findShifts(
    @Query('centerId') centerId: string,
    @Query('staffId') staffId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.shifts.findAll({ centerId, staffId, from, to }, user);
  }

  @ApiTags('shifts')
  @Roles(...STAFF_MGMT)
  @Patch('shifts/:id')
  updateShift(
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.shifts.update(id, dto, user);
  }

  // ── Payroll rate tables (HQ Admin only) ───────────────────────────
  @ApiTags('payroll-rate-tables')
  @Roles(Role.HQ_ADMIN)
  @Post('payroll-rate-tables')
  createRateTable(@Body() dto: CreateRateTableDto, @CurrentUser() user: AuthenticatedUser) {
    return this.rateTables.create(dto, user);
  }

  @ApiTags('payroll-rate-tables')
  @Roles(Role.HQ_ADMIN)
  @Get('payroll-rate-tables')
  findRateTables(@CurrentUser() user: AuthenticatedUser) {
    return this.rateTables.findAll(user);
  }

  @ApiTags('payroll-rate-tables')
  @Roles(Role.HQ_ADMIN)
  @Patch('payroll-rate-tables/:id')
  updateRateTable(
    @Param('id') id: string,
    @Body() dto: UpdateRateTableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rateTables.update(id, dto, user);
  }

  // ── Payroll ────────────────────────────────────────────────────
  @ApiTags('payroll')
  @Roles(...PAYROLL_ROLES)
  @Post('payroll/run')
  runPayroll(@Body() dto: RunPayrollDto, @CurrentUser() user: AuthenticatedUser) {
    return this.payroll.run(dto, user);
  }

  @ApiTags('payroll')
  @Roles(...PAYROLL_ROLES)
  @Get('payroll')
  findPayroll(
    @Query('staffId') staffId: string,
    @Query('centerId') centerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payroll.findAll({ staffId, centerId }, user);
  }
}
