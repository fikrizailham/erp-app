'use client';

import { FormEvent, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/StatCard';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  type: string;
  loyaltyPoints: number;
  loyaltyTier: { name: string } | null;
}

const KEY = '/customers';

export default function CustomersPage() {
  const { data: customers } = useSWR<Customer[]>(KEY, api.get);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', type: 'MEMBER' });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(KEY, {
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        type: form.type,
      });
      setShowForm(false);
      setForm({ name: '', phone: '', email: '', type: 'MEMBER' });
      mutate(KEY);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create customer');
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Customers & CRM" description="Profiles, purchase history, and loyalty membership." />
        <button className="btn-primary h-fit" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Customer'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <label className="label">Name</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="WALK_IN">Walk-in</option>
              <option value="MEMBER">Member</option>
              <option value="CORPORATE">Corporate</option>
              <option value="RESELLER">Reseller</option>
            </select>
          </div>
          <div className="col-span-full">
            {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
            <button type="submit" className="btn-primary">
              Save Customer
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <table className="table-base">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Type</th>
              <th>Loyalty Tier</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {customers?.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone ?? '—'}</td>
                <td>{c.type}</td>
                <td>{c.loyaltyTier?.name ?? '—'}</td>
                <td>{c.loyaltyPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
