import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { FranchiseFeeStatus } from '@prisma/client';

export class InvoiceLineItemDto {
  @IsString() description: string;
  @IsIn(['tuition', 'meal', 'extended_care', 'activity', 'other'])
  kind: string;
  @IsNumber() @IsPositive() quantity: number;
  @IsNumber() @IsPositive() unitPrice: number;
}

export class CreateInvoiceDto {
  @IsUUID() enrollmentId: string;
  @IsString() period: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => InvoiceLineItemDto)
  lineItems: InvoiceLineItemDto[];
  @IsDateString() dueDate: string;
}

export class RecordPaymentDto {
  @IsUUID() invoiceId: string;
  @IsNumber() @IsPositive() amount: number;
  @IsOptional() @IsString() referenceNo?: string;
}

export class UploadPaymentProofDto {
  @IsString() paymentProofUrl: string;
}

export class CreateFranchiseFeeDto {
  @IsUUID() centerId: string;
  @IsString() period: string;
  @IsNumber() @IsPositive() amount: number;
  @IsDateString() dueDate: string;
}

export class UpdateFranchiseFeeStatusDto {
  @IsIn(['PAID', 'UNPAID', 'OVERDUE'])
  status: FranchiseFeeStatus;
}
