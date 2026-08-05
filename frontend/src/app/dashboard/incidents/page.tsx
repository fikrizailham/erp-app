'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCenterContext } from '@/lib/center-context';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/StatusPill';
import { formatDateTime } from '@/lib/format';
import type { Child, IncidentLog, IncidentSeverity, IncidentType } from '@/types';

const TYPES: IncidentType[] = ['INJURY', 'MEDICATION', 'ALLERGY', 'OTHER'];
const SEVERITIES: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export default function IncidentsPage() {
  const { user } = useAuth();
  const { activeCenterId } = useCenterContext();
  const qs = activeCenterId ? `?centerId=${activeCenterId}` : '';
  const { data, mutate } = useApi<IncidentLog[]>(`/incidents${qs}`);
  const { data: children } = useApi<Child[]>(`/children${qs}`);
  const [showForm, setShowForm] = useState(false);
  const canLog = user?.role === 'CENTER_OWNER' || user?.role === 'FRONTDESK_STAFF';

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Incidents & Health Log</h1>

      {canLog && (
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Log Incident'}
        </button>
      )}
      {showForm && (
        <NewIncidentForm children={children ?? []} onCreated={() => { mutate(); setShowForm(false); }} />
      )}

      <div className="space-y-3">
        {data?.map((inc) => (
          <div key={inc.id} className="card p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{inc.child?.name} — {inc.type.replace(/_/g, ' ')}</p>
                <p className="text-sm text-gray-600 mt-1">{inc.description}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDateTime(inc.timestamp)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusPill status={inc.severity} />
                {inc.parentNotified && (
                  <span className={`text-xs ${inc.parentAck ? 'text-green-600' : 'text-amber-600'}`}>
                    {inc.parentAck ? 'Acknowledged' : 'Awaiting acknowledgement'}
                  </span>
                )}
              </div>
            </div>
            {user?.role === 'PARENT' && !inc.parentAck && (
              <button
                className="btn-secondary mt-3 text-xs"
                onClick={async () => {
                  await api.patch(`/incidents/${inc.id}/acknowledge`, {});
                  mutate();
                }}
              >
                Acknowledge
              </button>
            )}
          </div>
        ))}
        {data?.length === 0 && <p className="text-gray-400 text-center py-6">No incidents on file</p>}
      </div>
    </div>
  );
}

function NewIncidentForm({ children, onCreated }: { children: Child[]; onCreated: () => void }) {
  const [childId, setChildId] = useState('');
  const [type, setType] = useState<IncidentType>('INJURY');
  const [severity, setSeverity] = useState<IncidentSeverity>('LOW');
  const [description, setDescription] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post('/incidents', { childId, type, severity, description });
    onCreated();
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="label">Child</label>
          <select className="input" value={childId} onChange={(e) => setChildId(e.target.value)} required>
            <option value="">Select child...</option>
            {children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as IncidentType)}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Severity</label>
          <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required />
      </div>
      <button type="submit" className="btn-primary">Log Incident</button>
    </form>
  );
}
