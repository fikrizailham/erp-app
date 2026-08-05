import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthenticatedUser } from '../types/authenticated-user';

// Centralizes the "which centers can this user touch" rule so every module
// enforces the access matrix (Section 3 of the blueprint) the same way,
// instead of re-deriving it per-controller.
@Injectable()
export class CenterAccessService {
  /** Returns 'ALL' for HQ Admin, else the list of center ids the user may access. */
  scopeForRead(user: AuthenticatedUser): 'ALL' | string[] {
    if (user.role === Role.HQ_ADMIN) return 'ALL';
    return user.centerIds;
  }

  /** Throws if the user may not write to the given center. HQ Admin is read-only across centers. */
  assertCanWrite(user: AuthenticatedUser, centerId: string): void {
    if (user.role === Role.HQ_ADMIN) {
      throw new ForbiddenException('HQ Admin has read-only access across centers');
    }
    if (!user.centerIds.includes(centerId)) {
      throw new ForbiddenException('You do not have access to this center');
    }
  }

  /** Throws if the user may not even read data scoped to this center. */
  assertCanRead(user: AuthenticatedUser, centerId: string): void {
    if (user.role === Role.HQ_ADMIN) return;
    if (!user.centerIds.includes(centerId)) {
      throw new ForbiddenException('You do not have access to this center');
    }
  }

  /** Builds a Prisma `where` fragment restricting rows to accessible centers. */
  centerWhereClause(user: AuthenticatedUser, field = 'centerId'): Record<string, unknown> {
    const scope = this.scopeForRead(user);
    if (scope === 'ALL') return {};
    return { [field]: { in: scope } };
  }

  assertPayrollAccess(user: AuthenticatedUser): void {
    // Front-desk/Ops staff explicitly have no payroll access per the role matrix.
    if (user.role !== Role.HQ_ADMIN && user.role !== Role.CENTER_OWNER) {
      throw new ForbiddenException('You do not have access to payroll data');
    }
  }
}
