'use client';

import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/StatCard';

interface Subscription {
  id: string;
  name: string;
  frequency: string;
  status: string;
  nextRunDate: string;
  customer: { name: string };
  items: { quantity: string; product: { name: string } }[];
}

const KEY = '/subscriptions';

export default function SubscriptionsPage() {
  const { data: subscriptions } = useSWR<Subscription[]>(KEY, api.get);

  async function pause(id: string) {
    await api.patch(`${KEY}/${id}/pause`);
    mutate(KEY);
  }
  async function resume(id: string) {
    await api.patch(`${KEY}/${id}/resume`);
    mutate(KEY);
  }

  return (
    <div>
      <PageHeader
        title="Subscription Management"
        description="Recurring customer orders (weekly/monthly packages) — auto-generated as POS/online sales on schedule."
      />
      <div className="card">
        <table className="table-base">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Plan</th>
              <th>Items</th>
              <th>Frequency</th>
              <th>Next Run</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {subscriptions?.map((s) => (
              <tr key={s.id}>
                <td>{s.customer.name}</td>
                <td>{s.name}</td>
                <td>{s.items.map((i) => `${i.quantity}x ${i.product.name}`).join(', ')}</td>
                <td>{s.frequency}</td>
                <td>{formatDate(s.nextRunDate)}</td>
                <td>
                  <span className="badge bg-gray-100 text-gray-600">{s.status}</span>
                </td>
                <td>
                  {s.status === 'ACTIVE' ? (
                    <button className="text-xs text-amber-600" onClick={() => pause(s.id)}>
                      Pause
                    </button>
                  ) : s.status === 'PAUSED' ? (
                    <button className="text-xs text-bluma-600" onClick={() => resume(s.id)}>
                      Resume
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
