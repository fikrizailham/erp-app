'use client';

import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCenterContext } from '@/lib/center-context';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/StatusPill';
import { formatCurrency, formatDate } from '@/lib/format';
import type { FranchiseFee } from '@/types';

export default function FranchiseFeesPage() {
  const { user } = useAuth();
  const { activeCenterId, centers } = useCenterContext();
  const qs = activeCenterId ? `?centerId=${activeCenterId}` : '';
  const { data, mutate } = useApi<FranchiseFee[]>(`/franchise-fees${qs}`);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Franchise Fees (Center → HQ)</h1>

      {user?.role === 'HQ_ADMIN' && (
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Franchise Fee'}
        </button>
      )}
      {showForm && (
        <NewFeeForm centers={centers} onCreated={() => { mutate(); setShowForm(false); }} />
      )}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Center</th>
              <th>Period</th>
              <th>Amount</th>
              <th>Due date</th>
              <th>Status</th>
              {(user?.role === 'HQ_ADMIN' || user?.role === 'CENTER_OWNER') && <th></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((fee) => (
              <tr key={fee.id}>
                <td>{centers.find((c) => c.id === fee.centerId)?.name ?? fee.centerId}</td>
                <td className="font-medium">{fee.period}</td>
                <td>{formatCurrency(fee.amount)}</td>
                <td>{formatDate(fee.dueDate)}</td>
                <td><StatusPill status={fee.status} /></td>
                {(user?.role === 'HQ_ADMIN' || user?.role === 'CENTER_OWNER') && fee.status !== 'PAID' && (
                  <td>
                    <button
                      className="text-xs text-brand-600 hover:underline"
                      onClick={async () => {
                        await api.patch(`/franchise-fees/${fee.id}`, { status: 'PAID' });
                        mutate();
                      }}
                    >
                      Mark paid
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {data?.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-400 py-6">No franchise fees yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewFeeForm({
  centers,
  onCreated,
}: {
  centers: { id: string; name: string }[];
  onCreated: () => void;
}) {
  const [centerId, setCenterId] = useState(centers[0]?.id ?? '');
  const [period, setPeriod] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post('/franchise-fees', { centerId, period, amount: Number(amount), dueDate });
    onCreated();
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
      <div>
        <label className="label">Center</label>
        <select className="input" value={centerId} onChange={(e) => setCenterId(e.target.value)}>
          {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Period (YYYY-MM)</label>
        <input className="input" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-08" required />
      </div>
      <div>
        <label className="label">Amount</label>
        <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div>
        <label className="label">Due date</label>
        <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
      </div>
      <button type="submit" className="btn-primary">Create</button>
    </form>
  );
}
