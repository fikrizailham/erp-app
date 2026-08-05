export interface Me {
  id: string;
  email: string;
  name: string;
  role: 'HQ_ADMIN' | 'CENTER_OWNER' | 'FRONTDESK_STAFF' | 'PARENT';
  guardianId: string | null;
}

export interface Child {
  id: string;
  name: string;
  dob: string;
  allergies?: string | null;
  medicalNotes?: string | null;
  currentCenterId?: string | null;
}

export interface Enrollment {
  id: string;
  childId: string;
  centerId: string;
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
  startDate: string;
  child?: Child;
  program?: { name: string; ageGroup: string; baseFee: string };
}

export interface InvoiceLineItem {
  description: string;
  kind: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  period: string;
  lineItems: InvoiceLineItem[];
  total: string;
  status: 'UNPAID' | 'PAID' | 'OVERDUE';
  dueDate: string;
  paymentProofUrl?: string | null;
}

export interface AttendanceRecord {
  id: string;
  childId: string;
  checkInTime: string;
  checkInMethod: 'SELF' | 'FRONTDESK';
  checkOutTime?: string | null;
  checkOutMethod?: 'SELF' | 'FRONTDESK' | null;
  child?: Child;
}

export interface IncidentLog {
  id: string;
  childId: string;
  type: 'INJURY' | 'MEDICATION' | 'ALLERGY' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  timestamp: string;
  parentNotified: boolean;
  parentAck: boolean;
  child?: Child;
}

export interface Lead {
  id: string;
  childName: string;
  status: 'LEAD' | 'TOUR_SCHEDULED' | 'WAITLISTED' | 'ENROLLED' | 'LOST';
  tourDate?: string | null;
  waitlistPosition?: number | null;
}
