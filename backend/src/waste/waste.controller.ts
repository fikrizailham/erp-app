import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WasteService } from './waste.service';
import { CreateWasteRecordDto } from './dto/create-waste.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('waste')
@Controller('waste')
export class WasteController {
  constructor(private service: WasteService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE_STAFF, UserRole.PRODUCTION_STAFF)
  @Post()
  create(@Body() dto: CreateWasteRecordDto) {
    return this.service.recordWaste(dto);
  }

  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll({ type, from, to });
  }

  @Get('report')
  report(@Query('from') from: string, @Query('to') to: string) {
    return this.service.report(new Date(from), new Date(to));
  }
}
