import { PrismaClient, PayrollRateType, LeadStatus, CheckMethod, IncidentType, IncidentSeverity, InvoiceStatus, FranchiseFeeStatus, EnrollmentStatus, ScheduleType, AddOnType, InventoryCategory, StockTxType, RelationshipType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PASSWORD = 'Passw0rd!';

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log('Seeding Daycare Franchise ERP demo data...');

  // ── Franchise + Centers ────────────────────────────────────────────
  const franchise = await prisma.franchise.create({
    data: {
      name: 'Little Sprouts Daycare Franchise',
      brandSettings: { primaryColor: '#2E7D32', tagline: 'Where little ones grow big dreams' },
    },
  });

  const centerA = await prisma.center.create({
    data: {
      franchiseId: franchise.id,
      name: 'Little Sprouts — Downtown',
      address: '123 Main St, Springfield',
      licenseInfo: 'License #DC-2024-0091',
    },
  });

  const centerB = await prisma.center.create({
    data: {
      franchiseId: franchise.id,
      name: 'Little Sprouts — Riverside',
      address: '45 River Rd, Springfield',
      licenseInfo: 'License #DC-2024-0142',
    },
  });

  // ── Users ────────────────────────────────────────────────────────
  const passwordHash = await hash(PASSWORD);

  const hqAdmin = await prisma.user.create({
    data: {
      email: 'hq.admin@littlesprouts.demo',
      passwordHash,
      name: 'Harper Quinn',
      role: 'HQ_ADMIN',
      franchiseId: franchise.id,
    },
  });

  const ownerA = await prisma.user.create({
    data: {
      email: 'owner.downtown@littlesprouts.demo',
      passwordHash,
      name: 'Olivia Owner',
      role: 'CENTER_OWNER',
      centerAccess: { create: [{ centerId: centerA.id }] },
    },
  });

  const ownerB = await prisma.user.create({
    data: {
      email: 'owner.riverside@littlesprouts.demo',
      passwordHash,
      name: 'Ryan Riverside',
      role: 'CENTER_OWNER',
      centerAccess: { create: [{ centerId: centerB.id }] },
    },
  });

  const frontdeskA = await prisma.user.create({
    data: {
      email: 'frontdesk.downtown@littlesprouts.demo',
      passwordHash,
      name: 'Fiona Frontdesk',
      role: 'FRONTDESK_STAFF',
      centerAccess: { create: [{ centerId: centerA.id }] },
    },
  });

  const frontdeskB = await prisma.user.create({
    data: {
      email: 'frontdesk.riverside@littlesprouts.demo',
      passwordHash,
      name: 'Felix Frontdesk',
      role: 'FRONTDESK_STAFF',
      centerAccess: { create: [{ centerId: centerB.id }] },
    },
  });

  // ── Guardians + Children (global) ───────────────────────────────
  const guardian1 = await prisma.guardian.create({
    data: { name: 'Maria Garcia', contactInfo: { phone: '+1-555-0101', email: 'maria.g@example.com' } },
  });
  const guardian2 = await prisma.guardian.create({
    data: { name: 'James Chen', contactInfo: { phone: '+1-555-0102', email: 'james.c@example.com' } },
  });
  const guardian3 = await prisma.guardian.create({
    data: { name: 'Aisha Bello', contactInfo: { phone: '+1-555-0103', email: 'aisha.b@example.com' } },
  });
  const guardian4 = await prisma.guardian.create({
    data: { name: 'Tom Novak', contactInfo: { phone: '+1-555-0104', email: 'tom.n@example.com' } },
  });

  await prisma.user.create({
    data: { email: 'maria.g@example.com', passwordHash, name: 'Maria Garcia', role: 'PARENT', guardianId: guardian1.id },
  });
  await prisma.user.create({
    data: { email: 'james.c@example.com', passwordHash, name: 'James Chen', role: 'PARENT', guardianId: guardian2.id },
  });

  const childA1 = await prisma.child.create({
    data: { name: 'Sofia Garcia', dob: new Date('2021-03-14'), allergies: 'Peanuts', currentCenterId: centerA.id },
  });
  const childA2 = await prisma.child.create({
    data: { name: 'Liam Chen', dob: new Date('2020-07-02'), currentCenterId: centerA.id },
  });
  const childB1 = await prisma.child.create({
    data: { name: 'Zara Bello', dob: new Date('2021-11-20'), medicalNotes: 'Mild asthma — inhaler on file', currentCenterId: centerB.id },
  });
  const childB2 = await prisma.child.create({
    data: { name: 'Ethan Novak', dob: new Date('2019-09-09'), currentCenterId: centerB.id },
  });

  await prisma.guardianChildLink.createMany({
    data: [
      { guardianId: guardian1.id, childId: childA1.id, relationshipType: RelationshipType.MOTHER, isBillingGuardian: true, pickupAuthorized: true },
      { guardianId: guardian2.id, childId: childA2.id, relationshipType: RelationshipType.FATHER, isBillingGuardian: true, pickupAuthorized: true },
      { guardianId: guardian3.id, childId: childB1.id, relationshipType: RelationshipType.MOTHER, isBillingGuardian: true, pickupAuthorized: true },
      { guardianId: guardian4.id, childId: childB2.id, relationshipType: RelationshipType.FATHER, isBillingGuardian: true, pickupAuthorized: true },
    ],
  });

  // ── CRM: Leads across the pipeline ──────────────────────────────
  await prisma.lead.createMany({
    data: [
      { centerId: centerA.id, childName: 'Noah Kim', guardianContact: { name: 'Grace Kim', phone: '+1-555-0201' }, status: LeadStatus.LEAD },
      { centerId: centerA.id, childName: 'Ivy Park', guardianContact: { name: 'Daniel Park', phone: '+1-555-0202' }, status: LeadStatus.TOUR_SCHEDULED, tourDate: new Date(Date.now() + 3 * 86400000) },
      { centerId: centerA.id, childName: 'Mason Reyes', guardianContact: { name: 'Elena Reyes', phone: '+1-555-0203' }, status: LeadStatus.WAITLISTED, waitlistPosition: 1 },
      { centerId: centerA.id, childName: 'Chloe Adams', guardianContact: { name: 'Ben Adams', phone: '+1-555-0204' }, status: LeadStatus.WAITLISTED, waitlistPosition: 2 },
      { centerId: centerB.id, childName: 'Leo Martins', guardianContact: { name: 'Carla Martins', phone: '+1-555-0301' }, status: LeadStatus.LEAD },
      { centerId: centerB.id, childName: 'Ava Silva', guardianContact: { name: 'Rafael Silva', phone: '+1-555-0302' }, status: LeadStatus.LOST, notes: 'Chose a center closer to home' },
    ],
  });

  // ── Programs + Add-ons ────────────────────────────────────────────
  const programA = await prisma.program.create({
    data: { centerId: centerA.id, name: 'Toddler Full-Time', ageGroup: '1-3 years', baseFee: 1200, scheduleType: ScheduleType.FULL_TIME },
  });
  const programA2 = await prisma.program.create({
    data: { centerId: centerA.id, name: 'Preschool Part-Time', ageGroup: '3-5 years', baseFee: 750, scheduleType: ScheduleType.PART_TIME },
  });
  const programB = await prisma.program.create({
    data: { centerId: centerB.id, name: 'Toddler Full-Time', ageGroup: '1-3 years', baseFee: 1150, scheduleType: ScheduleType.FULL_TIME },
  });
  const programB2 = await prisma.program.create({
    data: { centerId: centerB.id, name: 'School-Age Drop-In', ageGroup: '6-10 years', baseFee: 40, scheduleType: ScheduleType.DROP_IN },
  });

  const [mealAddOn, extendedCareAddOn] = await Promise.all([
    prisma.addOnService.create({ data: { name: 'Hot Lunch Program', fee: 80, type: AddOnType.MEAL } }),
    prisma.addOnService.create({ data: { name: 'Extended Care (until 6pm)', fee: 150, type: AddOnType.EXTENDED_CARE } }),
    prisma.addOnService.create({ data: { name: 'Weekly Art Class', fee: 45, type: AddOnType.ACTIVITY } }),
  ]);

  // ── Enrollments ──────────────────────────────────────────────────
  const enrollmentA1 = await prisma.enrollment.create({
    data: { childId: childA1.id, centerId: centerA.id, programId: programA.id, billingGuardianId: guardian1.id, startDate: new Date('2026-01-15'), status: EnrollmentStatus.ACTIVE },
  });
  const enrollmentA2 = await prisma.enrollment.create({
    data: { childId: childA2.id, centerId: centerA.id, programId: programA2.id, billingGuardianId: guardian2.id, startDate: new Date('2026-02-01'), status: EnrollmentStatus.ACTIVE },
  });
  const enrollmentB1 = await prisma.enrollment.create({
    data: { childId: childB1.id, centerId: centerB.id, programId: programB.id, billingGuardianId: guardian3.id, startDate: new Date('2026-03-01'), status: EnrollmentStatus.ACTIVE },
  });
  const enrollmentB2 = await prisma.enrollment.create({
    data: { childId: childB2.id, centerId: centerB.id, programId: programB2.id, billingGuardianId: guardian4.id, startDate: new Date('2025-09-01'), status: EnrollmentStatus.ACTIVE },
  });

  // ── Invoices + Payments ──────────────────────────────────────────
  const invoicePaid = await prisma.invoice.create({
    data: {
      enrollmentId: enrollmentA1.id,
      centerId: centerA.id,
      billingGuardianId: guardian1.id,
      period: '2026-07',
      lineItems: [
        { description: 'Toddler Full-Time — July', kind: 'tuition', quantity: 1, unitPrice: 1200, amount: 1200 },
        { description: 'Hot Lunch Program', kind: 'meal', quantity: 1, unitPrice: 80, amount: 80 },
      ],
      total: 1280,
      status: InvoiceStatus.PAID,
      dueDate: new Date('2026-07-05'),
    },
  });
  await prisma.payment.create({
    data: { invoiceId: invoicePaid.id, amount: 1280, referenceNo: 'TRF-20260703-001', reconciledById: frontdeskA.id, reconciledAt: new Date('2026-07-04') },
  });

  await prisma.invoice.create({
    data: {
      enrollmentId: enrollmentA1.id,
      centerId: centerA.id,
      billingGuardianId: guardian1.id,
      period: '2026-08',
      lineItems: [
        { description: 'Toddler Full-Time — August', kind: 'tuition', quantity: 1, unitPrice: 1200, amount: 1200 },
        { description: 'Hot Lunch Program', kind: 'meal', quantity: 1, unitPrice: 80, amount: 80 },
      ],
      total: 1280,
      status: InvoiceStatus.UNPAID,
      dueDate: new Date('2026-08-05'),
    },
  });

  await prisma.invoice.create({
    data: {
      enrollmentId: enrollmentB2.id,
      centerId: centerB.id,
      billingGuardianId: guardian4.id,
      period: '2026-07',
      lineItems: [{ description: 'School-Age Drop-In — July', kind: 'tuition', quantity: 12, unitPrice: 40, amount: 480 }],
      total: 480,
      status: InvoiceStatus.OVERDUE,
      dueDate: new Date('2026-07-10'),
    },
  });

  // ── Franchise fees (Center -> HQ) ─────────────────────────────────
  await prisma.franchiseFee.createMany({
    data: [
      { centerId: centerA.id, period: '2026-07', amount: 500, status: FranchiseFeeStatus.PAID, dueDate: new Date('2026-07-01'), paidAt: new Date('2026-07-02') },
      { centerId: centerA.id, period: '2026-08', amount: 500, status: FranchiseFeeStatus.UNPAID, dueDate: new Date('2026-08-01') },
      { centerId: centerB.id, period: '2026-07', amount: 500, status: FranchiseFeeStatus.PAID, dueDate: new Date('2026-07-01'), paidAt: new Date('2026-07-01') },
      { centerId: centerB.id, period: '2026-08', amount: 500, status: FranchiseFeeStatus.OVERDUE, dueDate: new Date('2026-08-01') },
    ],
  });

  // ── Attendance ──────────────────────────────────────────────────
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(8, 15, 0, 0);
  const yesterdayOut = new Date(yesterday);
  yesterdayOut.setHours(17, 30, 0, 0);

  await prisma.attendanceRecord.createMany({
    data: [
      { childId: childA1.id, centerId: centerA.id, checkInTime: yesterday, checkInMethod: CheckMethod.SELF, checkOutTime: yesterdayOut, checkOutMethod: CheckMethod.FRONTDESK },
      { childId: childA2.id, centerId: centerA.id, checkInTime: yesterday, checkInMethod: CheckMethod.FRONTDESK, checkOutTime: yesterdayOut, checkOutMethod: CheckMethod.SELF },
      { childId: childB1.id, centerId: centerB.id, checkInTime: new Date(), checkInMethod: CheckMethod.SELF },
    ],
  });

  // ── Incident log ────────────────────────────────────────────────
  await prisma.incidentLog.create({
    data: {
      childId: childA1.id,
      type: IncidentType.INJURY,
      severity: IncidentSeverity.LOW,
      description: 'Minor scrape on knee during outdoor play. Cleaned and bandaged.',
      staffReporterId: frontdeskA.id,
      parentNotified: true,
      parentAck: true,
      parentAckAt: new Date(),
    },
  });

  // ── Staff, certifications, shifts ─────────────────────────────────
  const teacherA1 = await prisma.staff.create({
    data: { centerId: centerA.id, name: 'Grace Lin', role: 'Lead Teacher', contactInfo: { phone: '+1-555-0501' }, hireDate: new Date('2023-01-10'), baseSalary: 4200 },
  });
  const teacherA2 = await prisma.staff.create({
    data: { centerId: centerA.id, name: 'Marcus Bell', role: 'Assistant Teacher', contactInfo: { phone: '+1-555-0502' }, hireDate: new Date('2024-05-01'), baseSalary: 3200 },
  });
  const teacherB1 = await prisma.staff.create({
    data: { centerId: centerB.id, name: 'Priya Nair', role: 'Lead Teacher', contactInfo: { phone: '+1-555-0601' }, hireDate: new Date('2022-08-15'), baseSalary: 4100 },
  });

  await prisma.certification.createMany({
    data: [
      { staffId: teacherA1.id, type: 'CPR & First Aid', issueDate: new Date('2025-01-10'), expiryDate: new Date('2026-01-10'), alertStatus: 'EXPIRED' },
      { staffId: teacherA1.id, type: 'Food Handler Permit', issueDate: new Date('2025-06-01'), expiryDate: new Date(Date.now() + 20 * 86400000), alertStatus: 'EXPIRING_SOON' },
      { staffId: teacherA2.id, type: 'CPR & First Aid', issueDate: new Date('2026-02-01'), expiryDate: new Date('2027-02-01'), alertStatus: 'OK' },
      { staffId: teacherB1.id, type: 'CPR & First Aid', issueDate: new Date('2025-09-01'), expiryDate: new Date('2026-09-01'), alertStatus: 'OK' },
    ],
  });

  const shiftData = [] as any[];
  for (let d = 1; d <= 5; d++) {
    const date = new Date(`2026-08-0${d}T00:00:00Z`);
    const start = new Date(`2026-08-0${d}T08:00:00Z`);
    const end = new Date(`2026-08-0${d}T17:00:00Z`); // 9h -> 1h overtime/day
    shiftData.push({ staffId: teacherA1.id, centerId: centerA.id, date, startTime: start, endTime: end });
    shiftData.push({ staffId: teacherB1.id, centerId: centerB.id, date, startTime: start, endTime: end });
  }
  await prisma.shift.createMany({ data: shiftData });

  // ── Payroll rate tables — SAMPLE values only, validate before go-live ─
  await prisma.payrollRateTable.createMany({
    data: [
      { franchiseId: franchise.id, type: PayrollRateType.BPJS_HEALTH, label: 'BPJS Kesehatan (employee share)', rate: 0.01, maxIncome: 12000000, effectiveDate: new Date('2026-01-01') },
      { franchiseId: franchise.id, type: PayrollRateType.BPJS_EMPLOYMENT, label: 'BPJS Ketenagakerjaan JHT (employee share)', rate: 0.02, effectiveDate: new Date('2026-01-01') },
      { franchiseId: franchise.id, type: PayrollRateType.PPH21_BRACKET, label: 'PPh21 Bracket 1 (up to 60jt)', rate: 0.05, minIncome: 0, maxIncome: 60000000, effectiveDate: new Date('2026-01-01') },
      { franchiseId: franchise.id, type: PayrollRateType.PPH21_BRACKET, label: 'PPh21 Bracket 2 (60jt-250jt)', rate: 0.15, minIncome: 60000000, maxIncome: 250000000, effectiveDate: new Date('2026-01-01') },
      { franchiseId: franchise.id, type: PayrollRateType.OVERTIME_MULTIPLIER, label: 'Standard overtime multiplier', rate: 1.5, effectiveDate: new Date('2026-01-01') },
    ],
  });

  // ── Inventory ───────────────────────────────────────────────────
  const rice = await prisma.inventoryItem.create({
    data: { centerId: centerA.id, name: 'Rice (25kg bag)', category: InventoryCategory.FOOD, currentStock: 4, reorderThreshold: 5, unit: 'bag' },
  });
  await prisma.inventoryItem.create({
    data: { centerId: centerA.id, name: 'Diapers (size 4)', category: InventoryCategory.SUPPLIES, currentStock: 40, reorderThreshold: 20, unit: 'pack' },
  });
  await prisma.inventoryItem.create({
    data: { centerId: centerB.id, name: 'First Aid Kit Refill', category: InventoryCategory.SAFETY, currentStock: 2, reorderThreshold: 3, unit: 'kit' },
  });
  await prisma.stockTransaction.createMany({
    data: [
      { itemId: rice.id, type: StockTxType.IN, quantity: 10, reason: 'Monthly restock' },
      { itemId: rice.id, type: StockTxType.OUT, quantity: 6, reason: 'Kitchen usage' },
    ],
  });

  console.log('Seed complete.');
  console.log('---');
  console.log('Demo logins (all use password: %s)', PASSWORD);
  console.log('  HQ Admin:        hq.admin@littlesprouts.demo');
  console.log('  Center Owner A:  owner.downtown@littlesprouts.demo');
  console.log('  Center Owner B:  owner.riverside@littlesprouts.demo');
  console.log('  Front-desk A:    frontdesk.downtown@littlesprouts.demo');
  console.log('  Front-desk B:    frontdesk.riverside@littlesprouts.demo');
  console.log('  Parent:          maria.g@example.com');
  console.log('  Parent:          james.c@example.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
