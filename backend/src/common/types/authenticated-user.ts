import { Role } from '@prisma/client';

// Attached to the request by JwtStrategy.validate(). Carries everything
// downstream services need to enforce center-scoping without extra queries.
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  franchiseId: string | null;
  guardianId: string | null;
  staffId: string | null;
  centerIds: string[]; // centers this user has access to (CENTER_OWNER / FRONTDESK_STAFF)
}
