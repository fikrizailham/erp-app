import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';

class RegisterPushTokenDto {
  @IsString() token: string;
}

@ApiBearerAuth()
@ApiTags('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  @Roles(Role.HQ_ADMIN, Role.CENTER_OWNER, Role.FRONTDESK_STAFF, Role.PARENT)
  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findForCurrentUser(user);
  }

  @Roles(Role.PARENT)
  @Post('push-token')
  registerToken(@Body() dto: RegisterPushTokenDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.registerPushToken(user.guardianId!, dto.token);
  }

  @Roles(Role.HQ_ADMIN, Role.CENTER_OWNER, Role.FRONTDESK_STAFF, Role.PARENT)
  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.markRead(id, user);
  }
}
