'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCenterContext } from '@/lib/center-context';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import type { PayrollRecord, Staff } from '@/types';

interface RateTable {
  id: string;
  type: string;
  label: string;
  rate: string;
  minIncome?: string | null;
  maxIncome?: string | null;
  isActive: boolean;
}

export default function PayrollPage() {
  const { user } = useAuth();
  const { activeCenterId } = useCenterContext();
  const qs = activeCenterId ? `?centerId=${activeCenterId}` : '';
  const { data: records, mutate } = useApi<PayrollRecord[]>(`/payroll${qs}`);
  const { data: staffList } = useApi<Staff[]>(`/staff${qs}`);
  const { data: rateTables } = useApi<RateTable[]>(user?.role === 'HQ_ADMIN' ? '/payroll-rate-tables' : null);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Payroll</h1>

      <RunPayrollForm staffList={staffList ?? []} onRun={mutate} />

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Staff</th><th>Period</th><th>Base</th><th>OT hours</th><th>OT pay</th>
              <th>BPJS</th><th>PPh21</th><th>Net pay</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records?.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.staff?.name}</td>
                <td>{r.period}</td>
                <td>{formatCurrency(r.baseSalary)}</td>
                <td>{Number(r.overtimeHours).toFixed(1)}</td>
                <td>{formatCurrency(r.overtimePay)}</td>
                <td>-{formatCurrency(r.bpjsDeduction)}</td>
                <td>-{formatCurrency(r.pph21Tax)}</td>
                <td className="font-bold">{formatCurrency(r.netPay)}</td>
              </tr>
            ))}
            {records?.length === 0 && (
              <tr><td colSpan={8} className="text-center text-gray-400 py-6">No payroll records yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {user?.role === 'HQ_ADMIN' && <RateTablesSection rateTables={rateTables ?? []} />}
    </div>
  );
}

function RunPayrollForm({ staffList, onRun }: { staffList: Staff[]; onRun: () => void }) {
  const [staffId, setStaffId] = useState('');
  const [period, setPeriod] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/payroll/run', { staffId, period });
      onRun();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run payroll');
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="label">Staff</label>
        <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)} required>
          <option value="">Select staff...</option>
          {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Period (YYYY-MM)</label>
        <input className="input" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-08" required />
      </div>
      <button type="submit" className="btn-primary">Run Payroll</button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}

function RateTablesSection({ rateTables }: { rateTables: RateTable[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Statutory Rate Tables</h2>
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
        Sample BPJS/PPh21 values seeded for demo purposes — validate against current Indonesian
        regulations before go-live. Adjust rates here; the payroll engine never hardcodes them.
      </p>
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Type</th><th>Label</th><th>Rate</th><th>Min income</th><th>Max income</th><th>Active</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {rateTables.map((r) => (
              <tr key={r.id}>
                <td>{r.type.replace(/_/g, ' ')}</td>
                <td>{r.label}</td>
                <td>{r.type === 'OVERTIME_MULTIPLIER' ? `${r.rate}×` : `${(Number(r.rate) * 100).toFixed(2)}%`}</td>
                <td>{r.minIncome ? formatCurrency(r.minIncome) : '—'}</td>
                <td>{r.maxIncome ? formatCurrency(r.maxIncome) : '—'}</td>
                <td>{r.isActive ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
