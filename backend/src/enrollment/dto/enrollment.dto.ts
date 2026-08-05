import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { AddOnType, LeadStatus, ScheduleType, EnrollmentStatus } from '@prisma/client';

class GuardianContactDto {
  @IsString() name: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
}

export class CreateLeadDto {
  @IsUUID() centerId: string;
  @IsString() childName: string;
  @ValidateNested() @Type(() => GuardianContactDto) guardianContact: GuardianContactDto;
  @IsOptional() @IsUUID() guardianId?: string;
  @IsOptional() @IsDateString() tourDate?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateLeadDto {
  @IsOptional() @IsEnum(LeadStatus) status?: LeadStatus;
  @IsOptional() @IsDateString() tourDate?: string;
  @IsOptional() @IsInt() @Min(1) waitlistPosition?: number;
  @IsOptional() @IsString() notes?: string;
}

export class CreateProgramDto {
  @IsUUID() centerId: string;
  @IsString() name: string;
  @IsString() ageGroup: string;
  @IsNumber() @IsPositive() baseFee: number;
  @IsEnum(ScheduleType) scheduleType: ScheduleType;
}

export class UpdateProgramDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() ageGroup?: string;
  @IsOptional() @IsNumber() @IsPositive() baseFee?: number;
  @IsOptional() @IsEnum(ScheduleType) scheduleType?: ScheduleType;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateAddOnServiceDto {
  @IsString() name: string;
  @IsNumber() @IsPositive() fee: number;
  @IsEnum(AddOnType) type: AddOnType;
}

export class UpdateAddOnServiceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() @IsPositive() fee?: number;
  @IsOptional() @IsEnum(AddOnType) type?: AddOnType;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateEnrollmentDto {
  @IsUUID() childId: string;
  @IsUUID() centerId: string;
  @IsUUID() programId: string;
  @IsUUID() billingGuardianId: string;
  @IsDateString() startDate: string;
}

export class UpdateEnrollmentDto {
  @IsOptional() @IsEnum(EnrollmentStatus) status?: EnrollmentStatus;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsUUID() programId?: string;
  @IsOptional() @IsUUID() billingGuardianId?: string;
}
