import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto, UpdateEnrollmentDto } from './dto/enrollment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';

const ALL_ROLES = [Role.HQ_ADMIN, Role.CENTER_OWNER, Role.FRONTDESK_STAFF, Role.PARENT];

@ApiBearerAuth()
@ApiTags('enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('enrollments')
export class EnrollmentsController {
  constructor(private service: EnrollmentsService) {}

  @Roles(Role.CENTER_OWNER, Role.FRONTDESK_STAFF)
  @Post()
  create(@Body() dto: CreateEnrollmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @Roles(...ALL_ROLES)
  @Get()
  findAll(@Query('centerId') centerId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(centerId, user);
  }

  @Roles(...ALL_ROLES)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user);
  }

  @Roles(Role.CENTER_OWNER, Role.FRONTDESK_STAFF)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEnrollmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }
}
