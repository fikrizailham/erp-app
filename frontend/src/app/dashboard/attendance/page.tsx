'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCenterContext } from '@/lib/center-context';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { AttendanceRecord, Child } from '@/types';

interface Headcount {
  currentlyPresent: number;
  totalToday: number;
  date: string;
}

export default function AttendancePage() {
  const { user } = useAuth();
  const { activeCenterId } = useCenterContext();
  const qs = activeCenterId ? `?centerId=${activeCenterId}` : '';
  const { data, mutate } = useApi<AttendanceRecord[]>(`/attendance${qs}`);
  const { data: headcount } = useApi<Headcount>(
    activeCenterId ? `/attendance/headcount?centerId=${activeCenterId}` : null,
  );
  const { data: children } = useApi<Child[]>(`/children${qs}`);
  const canCheckInOut = user?.role !== 'HQ_ADMIN';

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Attendance</h1>

      {headcount && (
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="card p-4">
            <p className="text-xs text-gray-500">Currently present</p>
            <p className="text-2xl font-bold">{headcount.currentlyPresent}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500">Total checked in today</p>
            <p className="text-2xl font-bold">{headcount.totalToday}</p>
          </div>
        </div>
      )}

      {canCheckInOut && (
        <CheckInOutForm children={children ?? []} onDone={mutate} />
      )}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Child</th>
              <th>Check-in</th>
              <th>Method</th>
              <th>Check-out</th>
              <th>Method</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.child?.name}</td>
                <td>{formatDateTime(r.checkInTime)}</td>
                <td>{r.checkInMethod}</td>
                <td>{r.checkOutTime ? formatDateTime(r.checkOutTime) : <span className="text-green-600 font-medium">Present</span>}</td>
                <td>{r.checkOutMethod ?? '—'}</td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr><td colSpan={5} className="text-center text-gray-400 py-6">No attendance records yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CheckInOutForm({ children, onDone }: { children: Child[]; onDone: () => void }) {
  const [childId, setChildId] = useState('');
  const [error, setError] = useState('');

  async function checkIn(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/attendance/check-in', { childId });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed');
    }
  }

  async function checkOut() {
    setError('');
    try {
      await api.post('/attendance/check-out', { childId });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-out failed');
    }
  }

  return (
    <form onSubmit={checkIn} className="card p-4 flex gap-2 items-end">
      <div className="flex-1 max-w-xs">
        <label className="label">Child</label>
        <select className="input" value={childId} onChange={(e) => setChildId(e.target.value)} required>
          <option value="">Select child...</option>
          {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <button type="submit" className="btn-primary" disabled={!childId}>Check In</button>
      <button type="button" className="btn-secondary" disabled={!childId} onClick={checkOut}>Check Out</button>
      {error && <p className="text-sm text-red-600 ml-2">{error}</p>}
    </form>
  );
}
