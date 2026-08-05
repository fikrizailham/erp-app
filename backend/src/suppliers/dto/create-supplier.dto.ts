import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { SupplierType } from '@prisma/client';

export class CreateSupplierDto {
  @IsString()
  name: string;

  @IsEnum(SupplierType)
  type: SupplierType;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsInt()
  leadTimeDays?: number;
}
