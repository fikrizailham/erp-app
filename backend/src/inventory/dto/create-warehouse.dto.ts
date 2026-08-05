import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WarehouseType } from '@prisma/client';

export class CreateWarehouseDto {
  @IsString()
  name: string;

  @IsEnum(WarehouseType)
  type: WarehouseType;

  @IsOptional()
  @IsString()
  address?: string;
}
