import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';

@ApiBearerAuth()
@ApiTags('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Roles(Role.HQ_ADMIN, Role.CENTER_OWNER)
  @Get('financial')
  financial(@Query('centerId') centerId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.financial(centerId, user);
  }

  @Roles(Role.HQ_ADMIN, Role.CENTER_OWNER, Role.FRONTDESK_STAFF)
  @Get('operational')
  operational(@Query('centerId') centerId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.operational(centerId, user);
  }

  @Roles(Role.HQ_ADMIN, Role.CENTER_OWNER, Role.FRONTDESK_STAFF)
  @Get('staff')
  staff(@Query('centerId') centerId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.staff(centerId, user);
  }

  @Roles(Role.HQ_ADMIN, Role.CENTER_OWNER)
  @Get('franchise-rollup')
  franchiseRollup(@CurrentUser() user: AuthenticatedUser) {
    return this.service.franchiseRollup(user);
  }

  @Roles(Role.PARENT)
  @Get('my-summary')
  parentSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.service.parentSummary(user);
  }
}
