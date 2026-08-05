import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { FranchisesService } from './franchises.service';
import { CreateFranchiseDto, UpdateFranchiseDto } from './dto/master-data.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';

@ApiBearerAuth()
@ApiTags('franchises')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('franchises')
export class FranchisesController {
  constructor(private service: FranchisesService) {}

  // System bootstrap only — in practice a franchise is created once, out-of-band.
  @Roles(Role.HQ_ADMIN)
  @Post()
  create(@Body() dto: CreateFranchiseDto) {
    return this.service.create(dto);
  }

  @Roles(Role.HQ_ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user);
  }

  @Roles(Role.HQ_ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFranchiseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }
}
