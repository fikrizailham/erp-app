import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import { IncidentsService } from './incidents.service';
import { CheckInDto, CheckOutDto, CreateIncidentDto } from './dto/attendance.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';

const ALL_ROLES = [Role.HQ_ADMIN, Role.CENTER_OWNER, Role.FRONTDESK_STAFF, Role.PARENT];
const CHECKIN_ROLES = [Role.CENTER_OWNER, Role.FRONTDESK_STAFF, Role.PARENT];
const STAFF_ROLES = [Role.CENTER_OWNER, Role.FRONTDESK_STAFF];

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AttendanceController {
  constructor(private attendance: AttendanceService, private incidents: IncidentsService) {}

  // ── Attendance ────────────────────────────────────────────────────
  @ApiTags('attendance')
  @Roles(...CHECKIN_ROLES)
  @Post('attendance/check-in')
  checkIn(@Body() dto: CheckInDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.checkIn(dto, user);
  }

  @ApiTags('attendance')
  @Roles(...CHECKIN_ROLES)
  @Post('attendance/check-out')
  checkOut(@Body() dto: CheckOutDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.checkOut(dto, user);
  }

  @ApiTags('attendance')
  @Roles(...ALL_ROLES)
  @Get('attendance')
  findAll(
    @Query('centerId') centerId: string,
    @Query('childId') childId: string,
    @Query('date') date: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendance.findAll({ centerId, childId, date }, user);
  }

  @ApiTags('attendance')
  @Roles(...STAFF_ROLES, Role.HQ_ADMIN)
  @Get('attendance/headcount')
  headcount(@Query('centerId') centerId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attendance.headcount(centerId, user);
  }

  // ── Incidents ────────────────────────────────────────────────────
  @ApiTags('incidents')
  @Roles(...STAFF_ROLES)
  @Post('incidents')
  createIncident(@Body() dto: CreateIncidentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.incidents.create(dto, user);
  }

  @ApiTags('incidents')
  @Roles(...ALL_ROLES)
  @Get('incidents')
  findIncidents(
    @Query('childId') childId: string,
    @Query('centerId') centerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incidents.findAll({ childId, centerId }, user);
  }

  @ApiTags('incidents')
  @Roles(Role.PARENT)
  @Patch('incidents/:id/acknowledge')
  acknowledge(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.incidents.acknowledge(id, user);
  }
}
