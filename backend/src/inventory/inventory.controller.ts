import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { InventoryService } from './inventory.service';
import {
  CreateInventoryItemDto,
  CreateStockTransactionDto,
  UpdateInventoryItemDto,
} from './dto/inventory.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/types/authenticated-user';

const ALL_ROLES = [Role.HQ_ADMIN, Role.CENTER_OWNER, Role.FRONTDESK_STAFF];
const MGMT_ROLES = [Role.CENTER_OWNER, Role.FRONTDESK_STAFF];

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private service: InventoryService) {}

  @ApiTags('inventory')
  @Roles(...MGMT_ROLES)
  @Post('items')
  createItem(@Body() dto: CreateInventoryItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createItem(dto, user);
  }

  @ApiTags('inventory')
  @Roles(...ALL_ROLES)
  @Get('items')
  findItems(
    @Query('centerId') centerId: string,
    @Query('lowStockOnly') lowStockOnly: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findItems(centerId, lowStockOnly === 'true', user);
  }

  @ApiTags('inventory')
  @Roles(...MGMT_ROLES)
  @Patch('items/:id')
  updateItem(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateItem(id, dto, user);
  }

  @ApiTags('inventory')
  @Roles(...MGMT_ROLES)
  @Post('transactions')
  recordTransaction(@Body() dto: CreateStockTransactionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.recordTransaction(dto, user);
  }

  @ApiTags('inventory')
  @Roles(...ALL_ROLES)
  @Get('items/:itemId/transactions')
  findTransactions(@Param('itemId') itemId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findTransactions(itemId, user);
  }
}
