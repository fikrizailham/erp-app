import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PeopleService } from './people.service';
import {
  CreateChildDto,
  CreateGuardianChildLinkDto,
  CreateGuardianDto,
  UpdateChildDto,
  UpdateGuardianChildLinkDto,
  UpdateGuardianDto,
} from './dto/master-data.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';

const ALL_ROLES = [Role.HQ_ADMIN, Role.CENTER_OWNER, Role.FRONTDESK_STAFF, Role.PARENT];

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PeopleController {
  constructor(private service: PeopleService) {}

  @ApiTags('guardians')
  @Roles(Role.CENTER_OWNER, Role.FRONTDESK_STAFF)
  @Post('guardians')
  createGuardian(@Body() dto: CreateGuardianDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createGuardian(dto, user);
  }

  @ApiTags('guardians')
  @Roles(...ALL_ROLES)
  @Get('guardians')
  findGuardians(@Query('search') search: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findGuardians(search, user);
  }

  @ApiTags('guardians')
  @Roles(...ALL_ROLES)
  @Get('guardians/:id')
  findGuardian(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findGuardian(id, user);
  }

  @ApiTags('guardians')
  @Roles(Role.CENTER_OWNER, Role.FRONTDESK_STAFF)
  @Patch('guardians/:id')
  updateGuardian(
    @Param('id') id: string,
    @Body() dto: UpdateGuardianDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateGuardian(id, dto, user);
  }

  @ApiTags('children')
  @Roles(Role.CENTER_OWNER, Role.FRONTDESK_STAFF)
  @Post('children')
  createChild(@Body() dto: CreateChildDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createChild(dto, user);
  }

  @ApiTags('children')
  @Roles(...ALL_ROLES)
  @Get('children')
  findChildren(@Query('centerId') centerId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findChildren(centerId, user);
  }

  @ApiTags('children')
  @Roles(...ALL_ROLES)
  @Get('children/:id')
  findChild(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findChild(id, user);
  }

  @ApiTags('children')
  @Roles(Role.CENTER_OWNER, Role.FRONTDESK_STAFF)
  @Patch('children/:id')
  updateChild(
    @Param('id') id: string,
    @Body() dto: UpdateChildDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateChild(id, dto, user);
  }

  @ApiTags('guardian-child-links')
  @Roles(Role.CENTER_OWNER, Role.FRONTDESK_STAFF)
  @Post('guardian-child-links')
  createLink(@Body() dto: CreateGuardianChildLinkDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createLink(dto, user);
  }

  @ApiTags('guardian-child-links')
  @Roles(Role.CENTER_OWNER, Role.FRONTDESK_STAFF)
  @Patch('guardian-child-links/:id')
  updateLink(
    @Param('id') id: string,
    @Body() dto: UpdateGuardianChildLinkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateLink(id, dto, user);
  }
}
