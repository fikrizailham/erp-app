'use client';

import useSWR, { mutate } from 'swr';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/StatCard';

interface Delivery {
  id: string;
  deliveryNumber: string;
  status: string;
  scheduledDate: string;
  route: string | null;
  customer: { name: string };
  driver: { name: string } | null;
  vehicle: { plateNumber: string } | null;
}

const KEY = '/delivery';
const STATUSES = ['SCHEDULED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];

export default function DeliveryPage() {
  const { data: deliveries } = useSWR<Delivery[]>(KEY, api.get);

  async function updateStatus(id: string, status: string) {
    await api.patch(`${KEY}/${id}/status`, { status });
    mutate(KEY);
  }

  return (
    <div>
      <PageHeader title="Delivery Management" description="Customer, subscription, and corporate deliveries — driver, vehicle, and route tracking." />
      <div className="card">
        <table className="table-base">
          <thead>
            <tr>
              <th>Delivery #</th>
              <th>Customer</th>
              <th>Driver</th>
              <th>Vehicle</th>
              <th>Route</th>
              <th>Scheduled</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {deliveries?.map((d) => (
              <tr key={d.id}>
                <td>{d.deliveryNumber}</td>
                <td>{d.customer.name}</td>
                <td>{d.driver?.name ?? '—'}</td>
                <td>{d.vehicle?.plateNumber ?? '—'}</td>
                <td>{d.route ?? '—'}</td>
                <td>{formatDate(d.scheduledDate)}</td>
                <td>
                  <select className="input" value={d.status} onChange={(e) => updateStatus(d.id, e.target.value)}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
