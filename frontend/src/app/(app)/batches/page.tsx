'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/StatCard';

interface BatchAlertEntry {
  id: string;
  batchNumber: string;
  expiryDate: string;
  productionDate: string;
  remainingQty: number;
  daysToExpiry: number;
  product: { name: string };
}

interface ExpiryAlerts {
  finishedGoods: {
    expired: BatchAlertEntry[];
    expiringIn3Days: BatchAlertEntry[];
    expiringIn7Days: BatchAlertEntry[];
  };
}

interface TraceResult {
  batch: {
    batchNumber: string;
    productionDate: string;
    expiryDate: string;
    quantityProduced: string;
    status: string;
    product: { name: string };
    productionOrder: {
      orderNumber: string;
      operator: { name: string } | null;
      ingredientIssues: {
        quantityIssued: string;
        unit: string;
        rawMaterial: { name: string };
        rawMaterialLot: { lotNumber: string; supplier: { name: string } };
      }[];
    };
  };
  soldTo: { sale: { saleNumber: string; customer: { name: string } | null; createdAt: string } }[];
}

function AlertTable({ title, entries, tone }: { title: string; entries: BatchAlertEntry[]; tone: string }) {
  return (
    <div className="card">
      <h3 className={`mb-2 text-sm font-semibold ${tone}`}>
        {title} ({entries.length})
      </h3>
      {entries.length === 0 ? (
        <p className="text-xs text-gray-400">None</p>
      ) : (
        <table className="table-base">
          <thead>
            <tr>
              <th>Batch</th>
              <th>Product</th>
              <th>Remaining</th>
              <th>Expiry</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{e.batchNumber}</td>
                <td>{e.product.name}</td>
                <td>{e.remainingQty}</td>
                <td>{formatDate(e.expiryDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function BatchesPage() {
  const { data } = useSWR<ExpiryAlerts>('/inventory/expiry-alerts', api.get, {
    refreshInterval: 60000,
  });

  const [batchQuery, setBatchQuery] = useState('');
  const [trace, setTrace] = useState<TraceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookupBatch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTrace(null);
    try {
      const result = await api.get<TraceResult>(`/inventory/batches/${batchQuery}/trace`);
      setTrace(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Batch not found');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Batch & Expiry Tracking" description="FEFO-first inventory with full batch → production → ingredient → supplier traceability." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <AlertTable title="Expired" entries={data?.finishedGoods.expired ?? []} tone="text-red-600" />
        <AlertTable title="Expiring in 3 Days" entries={data?.finishedGoods.expiringIn3Days ?? []} tone="text-amber-600" />
        <AlertTable title="Expiring in 7 Days" entries={data?.finishedGoods.expiringIn7Days ?? []} tone="text-gray-700" />
      </div>

      <div className="card">
        <h3 className="mb-2 text-sm font-semibold">Trace a Batch</h3>
        <form onSubmit={lookupBatch} className="mb-4 flex gap-2">
          <input
            className="input max-w-sm"
            placeholder="Batch internal ID (from production order)"
            value={batchQuery}
            onChange={(e) => setBatchQuery(e.target.value)}
          />
          <button className="btn-primary" type="submit">
            Trace
          </button>
        </form>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {trace && (
          <div className="text-sm">
            <p className="mb-2 font-semibold">
              {trace.batch.batchNumber} — {trace.batch.product.name}
            </p>
            <p className="mb-1 text-xs text-gray-500">
              Produced {formatDate(trace.batch.productionDate)} · Expires {formatDate(trace.batch.expiryDate)} · Qty{' '}
              {trace.batch.quantityProduced}
            </p>
            <p className="mb-3 text-xs text-gray-500">Production order: {trace.batch.productionOrder.orderNumber}</p>

            <h4 className="mb-1 text-xs font-semibold uppercase text-gray-400">Ingredients & Suppliers</h4>
            <table className="table-base mb-4">
              <thead>
                <tr>
                  <th>Raw Material</th>
                  <th>Lot</th>
                  <th>Supplier</th>
                  <th>Qty Used</th>
                </tr>
              </thead>
              <tbody>
                {trace.batch.productionOrder.ingredientIssues.map((i, idx) => (
                  <tr key={idx}>
                    <td>{i.rawMaterial.name}</td>
                    <td>{i.rawMaterialLot.lotNumber}</td>
                    <td>{i.rawMaterialLot.supplier.name}</td>
                    <td>
                      {i.quantityIssued} {i.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 className="mb-1 text-xs font-semibold uppercase text-gray-400">Sold To</h4>
            {trace.soldTo.length === 0 ? (
              <p className="text-xs text-gray-400">Not yet sold.</p>
            ) : (
              <ul className="text-xs text-gray-600">
                {trace.soldTo.map((s, idx) => (
                  <li key={idx}>
                    {s.sale.saleNumber} — {s.sale.customer?.name ?? 'Walk-in'} ({formatDate(s.sale.createdAt)})
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
