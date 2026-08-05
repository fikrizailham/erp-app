import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RelationshipType, PortalAccessLevel, Role } from '@prisma/client';

export class CreateFranchiseDto {
  @IsString() name: string;
  @IsOptional() @IsObject() brandSettings?: Record<string, unknown>;
}

export class UpdateFranchiseDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsObject() brandSettings?: Record<string, unknown>;
}

export class CreateCenterDto {
  @IsUUID() franchiseId: string;
  @IsString() name: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() licenseInfo?: string;
}

export class UpdateCenterDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() licenseInfo?: string;
}

class ContactInfoDto {
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;
}

export class CreateGuardianDto {
  @IsString() name: string;
  @ValidateNested() @Type(() => ContactInfoDto) contactInfo: ContactInfoDto;
}

export class UpdateGuardianDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @ValidateNested() @Type(() => ContactInfoDto) contactInfo?: ContactInfoDto;
}

export class CreateChildDto {
  @IsString() name: string;
  @IsDateString() dob: string;
  @IsOptional() @IsString() allergies?: string;
  @IsOptional() @IsString() medicalNotes?: string;
  @IsOptional() @IsUUID() currentCenterId?: string;
}

export class UpdateChildDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsDateString() dob?: string;
  @IsOptional() @IsString() allergies?: string;
  @IsOptional() @IsString() medicalNotes?: string;
  @IsOptional() @IsUUID() currentCenterId?: string;
}

export class CreateGuardianChildLinkDto {
  @IsUUID() guardianId: string;
  @IsUUID() childId: string;
  @IsEnum(RelationshipType) relationshipType: RelationshipType;
  @IsOptional() @IsBoolean() isBillingGuardian?: boolean;
  @IsOptional() @IsBoolean() pickupAuthorized?: boolean;
  @IsOptional() @IsEnum(PortalAccessLevel) portalAccessLevel?: PortalAccessLevel;
}

export class UpdateGuardianChildLinkDto {
  @IsOptional() @IsEnum(RelationshipType) relationshipType?: RelationshipType;
  @IsOptional() @IsBoolean() isBillingGuardian?: boolean;
  @IsOptional() @IsBoolean() pickupAuthorized?: boolean;
  @IsOptional() @IsEnum(PortalAccessLevel) portalAccessLevel?: PortalAccessLevel;
}

export class CreateUserDto {
  @IsEmail() email: string;
  @MinLength(8) password: string;
  @IsString() name: string;
  @IsEnum(Role) role: Role;
  @IsOptional() @IsUUID() franchiseId?: string;
  @IsOptional() @IsUUID() guardianId?: string;
  @IsOptional() @IsUUID() staffId?: string;
  @IsOptional() @IsUUID(undefined, { each: true }) centerIds?: string[];
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsUUID(undefined, { each: true }) centerIds?: string[];
}
