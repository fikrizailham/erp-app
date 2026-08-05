import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RawMaterialsService } from './raw-materials.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('raw-materials')
@Controller('raw-materials')
export class RawMaterialsController {
  constructor(private service: RawMaterialsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE_STAFF)
  @Post()
  create(@Body() dto: CreateRawMaterialDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('category') category?: string) {
    return this.service.findAll(category);
  }

  @Get('low-stock')
  lowStock() {
    return this.service.lowStock();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.WAREHOUSE_STAFF)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRawMaterialDto) {
    return this.service.update(id, dto);
  }
}
