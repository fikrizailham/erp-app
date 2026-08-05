'use client';

import { useAuth } from '@/lib/auth';
import { useCenterContext } from '@/lib/center-context';
import { useApi } from '@/lib/useApi';
import { formatCurrency } from '@/lib/format';

interface FinancialReport {
  revenue: number;
  invoiceCount: { paid: number; outstanding: number };
  arAging: { current: number; days1to30: number; days31to60: number; days60plus: number };
  collectionsRate: number | null;
}

interface OperationalReport {
  enrollmentByStatus: Record<string, number>;
  leadsByStatus: Record<string, number>;
  attendanceTrend: Record<string, number>;
}

interface StaffReport {
  activeStaffCount: number;
  certificationsNeedingAttention: number;
  payrollTotalNetPay: number | null;
}

interface ParentSummary {
  outstandingBalance: number;
  recentAttendance: unknown[];
  totalIncidents: number;
}

export default function OverviewPage() {
  const { user } = useAuth();
  const { activeCenterId } = useCenterContext();
  const qs = activeCenterId ? `?centerId=${activeCenterId}` : '';

  if (user?.role === 'PARENT') {
    return <ParentOverview />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(user?.role === 'HQ_ADMIN' || user?.role === 'CENTER_OWNER') && (
          <FinancialCard qs={qs} />
        )}
        <OperationalCard qs={qs} />
        <StaffCard qs={qs} />
      </div>
    </div>
  );
}

function ParentOverview() {
  const { data } = useApi<ParentSummary>('/reports/my-summary');
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Family Summary</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs text-gray-500 mb-1">Outstanding balance</p>
          <p className="text-2xl font-bold">{data ? formatCurrency(data.outstandingBalance) : '—'}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-gray-500 mb-1">Total incidents on file</p>
          <p className="text-2xl font-bold">{data?.totalIncidents ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}

function FinancialCard({ qs }: { qs: string }) {
  const { data } = useApi<FinancialReport>(`/reports/financial${qs}`);
  return (
    <div className="card p-5">
      <p className="text-sm font-semibold mb-3">Financial</p>
      {data ? (
        <div className="space-y-2 text-sm">
          <Row label="Revenue (paid)" value={formatCurrency(data.revenue)} />
          <Row label="Invoices paid" value={String(data.invoiceCount.paid)} />
          <Row label="Invoices outstanding" value={String(data.invoiceCount.outstanding)} />
          <Row
            label="Collections rate"
            value={data.collectionsRate != null ? `${Math.round(data.collectionsRate * 100)}%` : '—'}
          />
          <div className="pt-2 border-t border-gray-100 mt-2">
            <p className="text-xs text-gray-500 mb-1">AR aging</p>
            <Row label="Current" value={formatCurrency(data.arAging.current)} />
            <Row label="1-30 days" value={formatCurrency(data.arAging.days1to30)} />
            <Row label="31-60 days" value={formatCurrency(data.arAging.days31to60)} />
            <Row label="60+ days" value={formatCurrency(data.arAging.days60plus)} />
          </div>
        </div>
      ) : (
        <Skeleton />
      )}
    </div>
  );
}

function OperationalCard({ qs }: { qs: string }) {
  const { data } = useApi<OperationalReport>(`/reports/operational${qs}`);
  return (
    <div className="card p-5">
      <p className="text-sm font-semibold mb-3">Enrollment & Leads</p>
      {data ? (
        <div className="space-y-2 text-sm">
          <p className="text-xs text-gray-500">Enrollments by status</p>
          {Object.entries(data.enrollmentByStatus).map(([k, v]) => (
            <Row key={k} label={k} value={String(v)} />
          ))}
          <p className="text-xs text-gray-500 pt-2 border-t border-gray-100 mt-2">Leads by status</p>
          {Object.entries(data.leadsByStatus).map(([k, v]) => (
            <Row key={k} label={k} value={String(v)} />
          ))}
        </div>
      ) : (
        <Skeleton />
      )}
    </div>
  );
}

function StaffCard({ qs }: { qs: string }) {
  const { data } = useApi<StaffReport>(`/reports/staff${qs}`);
  return (
    <div className="card p-5">
      <p className="text-sm font-semibold mb-3">Staff</p>
      {data ? (
        <div className="space-y-2 text-sm">
          <Row label="Active staff" value={String(data.activeStaffCount)} />
          <Row label="Certs needing attention" value={String(data.certificationsNeedingAttention)} />
          {data.payrollTotalNetPay != null && (
            <Row label="Payroll net (recorded)" value={formatCurrency(data.payrollTotalNetPay)} />
          )}
        </div>
      ) : (
        <Skeleton />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function Skeleton() {
  return <div className="animate-pulse h-20 bg-gray-100 rounded" />;
}
