'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCenterContext } from '@/lib/center-context';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/StatusPill';
import { formatDate } from '@/lib/format';
import type { Lead, LeadStatus, Program, Enrollment } from '@/types';

type Tab = 'leads' | 'programs' | 'enrollments';

export default function EnrollmentPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('leads');
  const canManage = user?.role === 'CENTER_OWNER' || user?.role === 'FRONTDESK_STAFF';

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Enrollment / CRM</h1>
      <div className="flex gap-2 border-b border-gray-200">
        {(['leads', 'programs', 'enrollments'] as Tab[]).map((t) => (
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
      {tab === 'leads' && <LeadsTab canManage={canManage} />}
      {tab === 'programs' && <ProgramsTab canManage={canManage} />}
      {tab === 'enrollments' && <EnrollmentsTab />}
    </div>
  );
}

const LEAD_STATUSES: LeadStatus[] = ['LEAD', 'TOUR_SCHEDULED', 'WAITLISTED', 'ENROLLED', 'LOST'];

function LeadsTab({ canManage }: { canManage: boolean }) {
  const { activeCenterId } = useCenterContext();
  const qs = activeCenterId ? `?centerId=${activeCenterId}` : '';
  const { data, mutate } = useApi<Lead[]>(`/leads${qs}`);
  const [showForm, setShowForm] = useState(false);

  async function updateStatus(lead: Lead, status: LeadStatus) {
    await api.patch(`/leads/${lead.id}`, { status });
    mutate();
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Lead'}
        </button>
      )}
      {showForm && <NewLeadForm centerId={activeCenterId} onCreated={() => { mutate(); setShowForm(false); }} />}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Child</th>
              <th>Guardian Contact</th>
              <th>Status</th>
              <th>Tour Date</th>
              <th>Waitlist #</th>
              {canManage && <th></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((lead) => (
              <tr key={lead.id}>
                <td className="font-medium">{lead.childName}</td>
                <td>{lead.guardianContact.name} — {lead.guardianContact.phone}</td>
                <td><StatusPill status={lead.status} /></td>
                <td>{lead.tourDate ? formatDate(lead.tourDate) : '—'}</td>
                <td>{lead.waitlistPosition ?? '—'}</td>
                {canManage && (
                  <td>
                    <select
                      className="input text-xs py-1"
                      value={lead.status}
                      onChange={(e) => updateStatus(lead, e.target.value as LeadStatus)}
                    >
                      {LEAD_STATUSES.map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </td>
                )}
              </tr>
            ))}
            {data?.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-400 py-6">No leads yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewLeadForm({ centerId, onCreated }: { centerId: string; onCreated: () => void }) {
  const [childName, setChildName] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/leads', {
        centerId,
        childName,
        guardianContact: { name: guardianName, phone },
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead');
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
      <div>
        <label className="label">Child name</label>
        <input className="input" value={childName} onChange={(e) => setChildName(e.target.value)} required />
      </div>
      <div>
        <label className="label">Guardian name</label>
        <input className="input" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} required />
      </div>
      <div>
        <label className="label">Phone</label>
        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary">Add Lead</button>
      {error && <p className="text-sm text-red-600 col-span-4">{error}</p>}
    </form>
  );
}

function ProgramsTab({ canManage }: { canManage: boolean }) {
  const { activeCenterId } = useCenterContext();
  const qs = activeCenterId ? `?centerId=${activeCenterId}` : '';
  const { data, mutate } = useApi<Program[]>(`/programs${qs}`);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      {canManage && (
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Program'}
        </button>
      )}
      {showForm && (
        <NewProgramForm centerId={activeCenterId} onCreated={() => { mutate(); setShowForm(false); }} />
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.map((p) => (
          <div key={p.id} className="card p-4">
            <p className="font-medium">{p.name}</p>
            <p className="text-xs text-gray-500">{p.ageGroup} · {p.scheduleType.replace('_', ' ')}</p>
            <p className="text-lg font-bold mt-2">${Number(p.baseFee).toFixed(2)}/mo</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewProgramForm({ centerId, onCreated }: { centerId: string; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [baseFee, setBaseFee] = useState('');
  const [scheduleType, setScheduleType] = useState('FULL_TIME');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post('/programs', { centerId, name, ageGroup, baseFee: Number(baseFee), scheduleType });
    onCreated();
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
      <div>
        <label className="label">Name</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="label">Age group</label>
        <input className="input" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} required />
      </div>
      <div>
        <label className="label">Base fee</label>
        <input className="input" type="number" value={baseFee} onChange={(e) => setBaseFee(e.target.value)} required />
      </div>
      <div>
        <label className="label">Schedule</label>
        <select className="input" value={scheduleType} onChange={(e) => setScheduleType(e.target.value)}>
          <option value="FULL_TIME">Full-time</option>
          <option value="PART_TIME">Part-time</option>
          <option value="DROP_IN">Drop-in</option>
        </select>
      </div>
      <button type="submit" className="btn-primary">Add Program</button>
    </form>
  );
}

function EnrollmentsTab() {
  const { activeCenterId } = useCenterContext();
  const qs = activeCenterId ? `?centerId=${activeCenterId}` : '';
  const { data } = useApi<Enrollment[]>(`/enrollments${qs}`);

  return (
    <div className="card overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr>
            <th>Child</th>
            <th>Program</th>
            <th>Billing Guardian</th>
            <th>Start Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data?.map((e) => (
            <tr key={e.id}>
              <td className="font-medium">{e.child?.name}</td>
              <td>{e.program?.name}</td>
              <td>{e.billingGuardian?.name}</td>
              <td>{formatDate(e.startDate)}</td>
              <td><StatusPill status={e.status} /></td>
            </tr>
          ))}
          {data?.length === 0 && (
            <tr><td colSpan={5} className="text-center text-gray-400 py-6">No enrollments yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
