import { IsEnum, IsString, IsUUID } from 'class-validator';
import { IncidentSeverity, IncidentType } from '@prisma/client';

export class CheckInDto {
  @IsUUID() childId: string;
}

export class CheckOutDto {
  @IsUUID() childId: string;
}

export class CreateIncidentDto {
  @IsUUID() childId: string;
  @IsEnum(IncidentType) type: IncidentType;
  @IsEnum(IncidentSeverity) severity: IncidentSeverity;
  @IsString() description: string;
}
