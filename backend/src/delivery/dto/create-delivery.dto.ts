import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateDeliveryDto {
  @IsOptional()
  @IsString()
  saleId?: string;

  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsDateString()
  scheduledDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
