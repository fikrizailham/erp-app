'use client';

import { FormEvent, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { api, ApiError } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader, StatCard } from '@/components/StatCard';

interface WasteRecord {
  id: string;
  type: 'RAW_MATERIAL' | 'FINISHED_GOODS';
  quantity: string;
  unit: string;
  reason: string;
  estimatedValue: string;
  recordedAt: string;
  rawMaterial: { name: string } | null;
  finishedGoodsBatch: { batchNumber: string; product: { name: string } } | null;
}

interface RawMaterialLot {
  id: string;
  lotNumber: string;
  rawMaterial: { name: string; unit: string };
}

interface FinishedGoodsStock {
  id: string;
  batch: { id: string; batchNumber: string; product: { name: string } };
  warehouse: { id: string; name: string };
}

const WASTE_KEY = '/waste';
const REASONS = ['EXPIRED', 'ROTTEN', 'DAMAGED', 'PRODUCTION_LOSS', 'QUALITY_REJECT', 'OTHER'];

export default function WastePage() {
  const { data: records } = useSWR<WasteRecord[]>(WASTE_KEY, api.get);
  const { data: rawLots } = useSWR<RawMaterialLot[]>('/inventory/stock/raw-materials', api.get);
  const { data: fgStocks } = useSWR<FinishedGoodsStock[]>('/inventory/stock/finished-goods', api.get);

  const totalValue = records?.reduce((sum, r) => sum + Number(r.estimatedValue), 0) ?? 0;

  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<'RAW_MATERIAL' | 'FINISHED_GOODS'>('FINISHED_GOODS');
  const [itemId, setItemId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('EXPIRED');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (type === 'RAW_MATERIAL') {
        const lot = rawLots?.find((l) => l.id === itemId);
        await api.post(WASTE_KEY, {
          type,
          rawMaterialLotId: itemId,
          quantity: Number(quantity),
          unit: lot?.rawMaterial.unit ?? 'unit',
          reason,
        });
      } else {
        const stock = fgStocks?.find((s) => s.id === itemId);
        await api.post(WASTE_KEY, {
          type,
          finishedGoodsBatchId: stock?.batch.id,
          warehouseId: stock?.warehouse.id,
          quantity: Number(quantity),
          unit: 'bottle',
          reason,
        });
      }
      setShowForm(false);
      setItemId('');
      setQuantity('');
      mutate(WASTE_KEY);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record waste');
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Waste Management" description="Track raw material and finished goods waste, with automatic accounting entries." />
        <button className="btn-primary h-fit" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ Record Waste'}
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="Total Waste Value" value={formatCurrency(totalValue)} tone="danger" />
        <StatCard label="Records" value={String(records?.length ?? 0)} />
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <label className="label">Type</label>
            <select className="input" value={type} onChange={(e) => { setType(e.target.value as any); setItemId(''); }}>
              <option value="FINISHED_GOODS">Finished Goods</option>
              <option value="RAW_MATERIAL">Raw Material</option>
            </select>
          </div>
          <div>
            <label className="label">Item</label>
            <select required className="input" value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">Select…</option>
              {type === 'RAW_MATERIAL'
                ? rawLots?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.rawMaterial.name} — {l.lotNumber}
                    </option>
                  ))
                : fgStocks?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.batch.product.name} — {s.batch.batchNumber} ({s.warehouse.name})
                    </option>
                  ))}
            </select>
          </div>
          <div>
            <label className="label">Quantity</label>
            <input required type="number" className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <label className="label">Reason</label>
            <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-full">
            {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
            <button type="submit" className="btn-primary">
              Record Waste
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <table className="table-base">
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Reason</th>
              <th>Value</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {records?.map((r) => (
              <tr key={r.id}>
                <td>{r.type === 'RAW_MATERIAL' ? r.rawMaterial?.name : `${r.finishedGoodsBatch?.product.name} (${r.finishedGoodsBatch?.batchNumber})`}</td>
                <td>{r.type.replace('_', ' ')}</td>
                <td>
                  {r.quantity} {r.unit}
                </td>
                <td>{r.reason.replace('_', ' ')}</td>
                <td>{formatCurrency(Number(r.estimatedValue))}</td>
                <td>{formatDate(r.recordedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
