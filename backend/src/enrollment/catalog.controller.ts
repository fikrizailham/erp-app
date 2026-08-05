import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CatalogService } from './catalog.service';
import {
  CreateAddOnServiceDto,
  CreateProgramDto,
  UpdateAddOnServiceDto,
  UpdateProgramDto,
} from './dto/enrollment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';

const ALL_ROLES = [Role.HQ_ADMIN, Role.CENTER_OWNER, Role.FRONTDESK_STAFF, Role.PARENT];

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class CatalogController {
  constructor(private service: CatalogService) {}

  @ApiTags('programs')
  @Roles(Role.CENTER_OWNER)
  @Post('programs')
  createProgram(@Body() dto: CreateProgramDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createProgram(dto, user);
  }

  @ApiTags('programs')
  @Roles(...ALL_ROLES)
  @Get('programs')
  findPrograms(@Query('centerId') centerId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findPrograms(centerId, user);
  }

  @ApiTags('programs')
  @Roles(Role.CENTER_OWNER)
  @Patch('programs/:id')
  updateProgram(
    @Param('id') id: string,
    @Body() dto: UpdateProgramDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateProgram(id, dto, user);
  }

  @ApiTags('addon-services')
  @Roles(Role.HQ_ADMIN, Role.CENTER_OWNER)
  @Post('addon-services')
  createAddOn(@Body() dto: CreateAddOnServiceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createAddOn(dto, user);
  }

  @ApiTags('addon-services')
  @Roles(...ALL_ROLES)
  @Get('addon-services')
  findAddOns() {
    return this.service.findAddOns();
  }

  @ApiTags('addon-services')
  @Roles(Role.HQ_ADMIN, Role.CENTER_OWNER)
  @Patch('addon-services/:id')
  updateAddOn(
    @Param('id') id: string,
    @Body() dto: UpdateAddOnServiceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateAddOn(id, dto, user);
  }
}
