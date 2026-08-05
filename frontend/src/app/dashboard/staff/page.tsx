'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCenterContext } from '@/lib/center-context';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/StatusPill';
import { formatDate } from '@/lib/format';
import type { Certification, Shift, Staff } from '@/types';

type Tab = 'staff' | 'certifications' | 'shifts';

export default function StaffPage() {
  const [tab, setTab] = useState<Tab>('staff');
  const { user } = useAuth();
  const canManage = user?.role === 'CENTER_OWNER' || user?.role === 'FRONTDESK_STAFF';

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Staff & HCM</h1>
      <div className="flex gap-2 border-b border-gray-200">
        {(['staff', 'certifications', 'shifts'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium capitalize border-b-2 -mb-px ${
              tab === t ? 'border-brand-500 text-brand-700' : 'border-transparent text-gray-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'staff' && <StaffTab canManage={canManage} />}
      {tab === 'certifications' && <CertificationsTab canManage={canManage} />}
      {tab === 'shifts' && <ShiftsTab canManage={canManage} />}
    </div>
  );
}

function StaffTab({ canManage }: { canManage: boolean }) {
  const { activeCenterId } = useCenterContext();
  const qs = activeCenterId ? `?centerId=${activeCenterId}` : '';
  const { data, mutate } = useApi<Staff[]>(`/staff${qs}`);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      {canManage && (
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Staff'}
        </button>
      )}
      {showForm && (
        <NewStaffForm centerId={activeCenterId} onCreated={() => { mutate(); setShowForm(false); }} />
      )}
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Name</th><th>Role</th><th>Hire date</th><th>Base salary</th><th>Status</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.name}</td>
                <td>{s.role}</td>
                <td>{formatDate(s.hireDate)}</td>
                <td>${Number(s.baseSalary).toFixed(2)}</td>
                <td><StatusPill status={s.isActive ? 'ACTIVE' : 'ENDED'} /></td>
              </tr>
            ))}
            {data?.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-6">No staff yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewStaffForm({ centerId, onCreated }: { centerId: string; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [baseSalary, setBaseSalary] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post('/staff', { centerId, name, role, hireDate, baseSalary: Number(baseSalary), contactInfo: {} });
    onCreated();
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
      <div><label className="label">Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><label className="label">Role</label><input className="input" value={role} onChange={(e) => setRole(e.target.value)} required /></div>
      <div><label className="label">Hire date</label><input className="input" type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} required /></div>
      <div><label className="label">Base salary (monthly)</label><input className="input" type="number" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} required /></div>
      <button type="submit" className="btn-primary">Add Staff</button>
    </form>
  );
}

function CertificationsTab({ canManage }: { canManage: boolean }) {
  const { activeCenterId } = useCenterContext();
  const qs = activeCenterId ? `?centerId=${activeCenterId}` : '';
  const { data: certs, mutate } = useApi<Certification[]>(`/certifications${qs}`);
  const { data: staffList } = useApi<Staff[]>(`/staff${qs}`);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      {canManage && (
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Certification'}
        </button>
      )}
      {showForm && (
        <NewCertForm staffList={staffList ?? []} onCreated={() => { mutate(); setShowForm(false); }} />
      )}
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Staff</th><th>Type</th><th>Issue date</th><th>Expiry date</th><th>Status</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {certs?.map((c) => (
              <tr key={c.id}>
                <td className="font-medium">{c.staff?.name}</td>
                <td>{c.type}</td>
                <td>{formatDate(c.issueDate)}</td>
                <td>{formatDate(c.expiryDate)}</td>
                <td><StatusPill status={c.alertStatus} /></td>
              </tr>
            ))}
            {certs?.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-6">No certifications on file</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewCertForm({ staffList, onCreated }: { staffList: Staff[]; onCreated: () => void }) {
  const [staffId, setStaffId] = useState('');
  const [type, setType] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post('/certifications', { staffId, type, issueDate, expiryDate });
    onCreated();
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
      <div>
        <label className="label">Staff</label>
        <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)} required>
          <option value="">Select...</option>
          {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div><label className="label">Type</label><input className="input" value={type} onChange={(e) => setType(e.target.value)} required placeholder="CPR & First Aid" /></div>
      <div><label className="label">Issue date</label><input className="input" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required /></div>
      <div><label className="label">Expiry date</label><input className="input" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} required /></div>
      <button type="submit" className="btn-primary">Add</button>
    </form>
  );
}

function ShiftsTab({ canManage }: { canManage: boolean }) {
  const { activeCenterId } = useCenterContext();
  const qs = activeCenterId ? `?centerId=${activeCenterId}` : '';
  const { data: shifts, mutate } = useApi<Shift[]>(`/shifts${qs}`);
  const { data: staffList } = useApi<Staff[]>(`/staff${qs}`);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      {canManage && (
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Shift'}
        </button>
      )}
      {showForm && (
        <NewShiftForm centerId={activeCenterId} staffList={staffList ?? []} onCreated={() => { mutate(); setShowForm(false); }} />
      )}
      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead><tr><th>Staff</th><th>Date</th><th>Start</th><th>End</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {shifts?.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.staff?.name}</td>
                <td>{formatDate(s.date)}</td>
                <td>{new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td>{new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              </tr>
            ))}
            {shifts?.length === 0 && <tr><td colSpan={4} className="text-center text-gray-400 py-6">No shifts scheduled</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewShiftForm({
  centerId,
  staffList,
  onCreated,
}: {
  centerId: string;
  staffList: Staff[];
  onCreated: () => void;
}) {
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('17:00');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post('/shifts', {
      staffId,
      centerId,
      date,
      startTime: `${date}T${start}:00.000Z`,
      endTime: `${date}T${end}:00.000Z`,
    });
    onCreated();
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
      <div>
        <label className="label">Staff</label>
        <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)} required>
          <option value="">Select...</option>
          {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div><label className="label">Date</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
      <div><label className="label">Start</label><input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} required /></div>
      <div><label className="label">End</label><input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required /></div>
      <button type="submit" className="btn-primary">Add Shift</button>
    </form>
  );
}
