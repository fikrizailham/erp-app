import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MarketplaceName, Prisma } from '@prisma/client';
import { MarketplaceService } from './marketplace.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private service: MarketplaceService) {}

  @Get('channels')
  findChannels() {
    return this.service.findChannels();
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post('channels')
  upsertChannel(
    @Body('name') name: MarketplaceName,
    @Body('isActive') isActive: boolean,
    @Body('apiConfig') apiConfig?: Prisma.InputJsonValue,
  ) {
    return this.service.upsertChannel(name, isActive, apiConfig);
  }

  // Placeholder webhook endpoint — a real integration would verify the
  // marketplace's signature/HMAC before trusting this payload.
  @Post('webhook/:channel')
  recordOrder(
    @Param('channel') channel: MarketplaceName,
    @Body('externalOrderId') externalOrderId: string,
    @Body('status') status: string,
    @Body() rawPayload: Prisma.InputJsonValue,
  ) {
    return this.service.recordIncomingOrder(channel, externalOrderId, status, rawPayload);
  }

  @Get('orders')
  findOrders(@Query('channel') channel?: MarketplaceName) {
    return this.service.findOrders(channel);
  }
}
