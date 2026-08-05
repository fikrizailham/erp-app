export type Role = 'HQ_ADMIN' | 'CENTER_OWNER' | 'FRONTDESK_STAFF' | 'PARENT';

export interface Me {
  id: string;
  email: string;
  name: string;
  role: Role;
  franchiseId: string | null;
  guardianId: string | null;
  staffId: string | null;
  centerAccess: { centerId: string; center: Center }[];
}

export interface Center {
  id: string;
  franchiseId: string;
  name: string;
  address?: string | null;
  licenseInfo?: string | null;
}

export interface Guardian {
  id: string;
  name: string;
  contactInfo: { phone?: string; email?: string; address?: string };
}

export interface Child {
  id: string;
  name: string;
  dob: string;
  allergies?: string | null;
  medicalNotes?: string | null;
  currentCenterId?: string | null;
}

export type LeadStatus = 'LEAD' | 'TOUR_SCHEDULED' | 'WAITLISTED' | 'ENROLLED' | 'LOST';

export interface Lead {
  id: string;
  centerId: string;
  childName: string;
  guardianContact: { name: string; phone?: string; email?: string };
  status: LeadStatus;
  tourDate?: string | null;
  waitlistPosition?: number | null;
  notes?: string | null;
  createdAt: string;
}

export interface Program {
  id: string;
  centerId: string;
  name: string;
  ageGroup: string;
  baseFee: string;
  scheduleType: 'FULL_TIME' | 'PART_TIME' | 'DROP_IN';
  isActive: boolean;
}

export interface AddOnService {
  id: string;
  name: string;
  fee: string;
  type: 'MEAL' | 'EXTENDED_CARE' | 'ACTIVITY';
  isActive: boolean;
}

export type EnrollmentStatus = 'ACTIVE' | 'PAUSED' | 'ENDED';

export interface Enrollment {
  id: string;
  childId: string;
  centerId: string;
  programId: string;
  billingGuardianId: string;
  startDate: string;
  endDate?: string | null;
  status: EnrollmentStatus;
  child?: Child;
  program?: Program;
  billingGuardian?: Guardian;
}

export type InvoiceStatus = 'UNPAID' | 'PAID' | 'OVERDUE';

export interface InvoiceLineItem {
  description: string;
  kind: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  enrollmentId: string;
  centerId: string;
  billingGuardianId: string;
  period: string;
  lineItems: InvoiceLineItem[];
  total: string;
  status: InvoiceStatus;
  dueDate: string;
  paymentProofUrl?: string | null;
  payments?: Payment[];
  billingGuardian?: Guardian;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: string;
  method: 'BANK_TRANSFER';
  referenceNo?: string | null;
  reconciledAt?: string | null;
}

export type FranchiseFeeStatus = 'UNPAID' | 'PAID' | 'OVERDUE';

export interface FranchiseFee {
  id: string;
  centerId: string;
  period: string;
  amount: string;
  status: FranchiseFeeStatus;
  dueDate: string;
  paidAt?: string | null;
}

export interface AttendanceRecord {
  id: string;
  childId: string;
  centerId: string;
  checkInTime: string;
  checkInMethod: 'SELF' | 'FRONTDESK';
  checkOutTime?: string | null;
  checkOutMethod?: 'SELF' | 'FRONTDESK' | null;
  child?: Child;
}

export type IncidentType = 'INJURY' | 'MEDICATION' | 'ALLERGY' | 'OTHER';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface IncidentLog {
  id: string;
  childId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  description: string;
  timestamp: string;
  parentNotified: boolean;
  parentAck: boolean;
  child?: Child;
}

export interface Staff {
  id: string;
  centerId: string;
  name: string;
  role: string;
  contactInfo: { phone?: string; email?: string };
  hireDate: string;
  baseSalary: string;
  isActive: boolean;
  certifications?: Certification[];
  shifts?: Shift[];
}

export type CertAlertStatus = 'OK' | 'EXPIRING_SOON' | 'EXPIRED';

export interface Certification {
  id: string;
  staffId: string;
  type: string;
  issueDate: string;
  expiryDate: string;
  alertStatus: CertAlertStatus;
  staff?: Staff;
}

export interface Shift {
  id: string;
  staffId: string;
  centerId: string;
  date: string;
  startTime: string;
  endTime: string;
  staff?: Staff;
}

export interface PayrollRecord {
  id: string;
  staffId: string;
  period: string;
  baseSalary: string;
  overtimeHours: string;
  overtimePay: string;
  bpjsDeduction: string;
  pph21Tax: string;
  netPay: string;
  breakdown: Record<string, unknown>;
  staff?: Staff;
}

export type InventoryCategory = 'FOOD' | 'SUPPLIES' | 'SAFETY';

export interface InventoryItem {
  id: string;
  centerId: string;
  name: string;
  category: InventoryCategory;
  currentStock: string;
  reorderThreshold: string;
  unit: string;
}
