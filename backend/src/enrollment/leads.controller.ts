import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LeadStatus, Role } from '@prisma/client';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto } from './dto/enrollment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';

@ApiBearerAuth()
@ApiTags('leads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private service: LeadsService) {}

  @Roles(Role.CENTER_OWNER, Role.FRONTDESK_STAFF)
  @Post()
  create(@Body() dto: CreateLeadDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @Roles(Role.HQ_ADMIN, Role.CENTER_OWNER, Role.FRONTDESK_STAFF, Role.PARENT)
  @Get()
  findAll(
    @Query('centerId') centerId: string,
    @Query('status') status: LeadStatus,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findAll(centerId, status, user);
  }

  @Roles(Role.HQ_ADMIN, Role.CENTER_OWNER, Role.FRONTDESK_STAFF, Role.PARENT)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user);
  }

  @Roles(Role.CENTER_OWNER, Role.FRONTDESK_STAFF)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }
}
