import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { PayrollRateType } from '@prisma/client';

class StaffContactDto {
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
}

export class CreateStaffDto {
  @IsUUID() centerId: string;
  @IsString() name: string;
  @IsString() role: string;
  @ValidateNested() @Type(() => StaffContactDto) contactInfo: StaffContactDto;
  @IsDateString() hireDate: string;
  @IsOptional() @IsNumber() @IsPositive() baseSalary?: number;
}

export class UpdateStaffDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @ValidateNested() @Type(() => StaffContactDto) contactInfo?: StaffContactDto;
  @IsOptional() @IsNumber() @IsPositive() baseSalary?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateCertificationDto {
  @IsUUID() staffId: string;
  @IsString() type: string;
  @IsDateString() issueDate: string;
  @IsDateString() expiryDate: string;
}

export class UpdateCertificationDto {
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsDateString() issueDate?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
}

export class CreateShiftDto {
  @IsUUID() staffId: string;
  @IsUUID() centerId: string;
  @IsDateString() date: string;
  @IsDateString() startTime: string;
  @IsDateString() endTime: string;
}

export class UpdateShiftDto {
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsDateString() startTime?: string;
  @IsOptional() @IsDateString() endTime?: string;
}

export class CreateRateTableDto {
  @IsEnum(PayrollRateType) type: PayrollRateType;
  @IsString() label: string;
  @IsNumber() rate: number;
  @IsOptional() @IsNumber() minIncome?: number;
  @IsOptional() @IsNumber() maxIncome?: number;
  @IsDateString() effectiveDate: string;
}

export class UpdateRateTableDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsNumber() rate?: number;
  @IsOptional() @IsNumber() minIncome?: number;
  @IsOptional() @IsNumber() maxIncome?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class RunPayrollDto {
  @IsUUID() staffId: string;
  @IsString() period: string; // "YYYY-MM"
}
