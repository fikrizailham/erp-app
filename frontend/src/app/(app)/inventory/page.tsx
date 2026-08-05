'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/StatCard';

interface RawMaterialLot {
  id: string;
  lotNumber: string;
  quantityRemaining: string;
  expiryDate: string | null;
  rawMaterial: { name: string; unit: string };
  warehouse: { name: string };
  supplier: { name: string };
}

interface FinishedGoodsStock {
  id: string;
  quantity: string;
  batch: { batchNumber: string; expiryDate: string; product: { name: string } };
  warehouse: { name: string };
}

export default function InventoryPage() {
  const [tab, setTab] = useState<'raw' | 'fg'>('fg');
  const { data: rawStock } = useSWR<RawMaterialLot[]>('/inventory/stock/raw-materials', api.get);
  const { data: fgStock } = useSWR<FinishedGoodsStock[]>('/inventory/stock/finished-goods', api.get);

  return (
    <div>
      <PageHeader title="Inventory Management" description="Multi-warehouse stock — Raw Material, Production, Finished Goods, Outlet — ordered FEFO." />

      <div className="mb-4 flex gap-2">
        <button className={`btn-secondary ${tab === 'fg' ? 'bg-bluma-50 text-bluma-700' : ''}`} onClick={() => setTab('fg')}>
          Finished Goods
        </button>
        <button className={`btn-secondary ${tab === 'raw' ? 'bg-bluma-50 text-bluma-700' : ''}`} onClick={() => setTab('raw')}>
          Raw Materials
        </button>
      </div>

      {tab === 'fg' && (
        <div className="card">
          <table className="table-base">
            <thead>
              <tr>
                <th>Batch</th>
                <th>Product</th>
                <th>Warehouse</th>
                <th>Quantity</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {fgStock?.map((s) => (
                <tr key={s.id}>
                  <td>{s.batch.batchNumber}</td>
                  <td>{s.batch.product.name}</td>
                  <td>{s.warehouse.name}</td>
                  <td>{s.quantity}</td>
                  <td>{formatDate(s.batch.expiryDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'raw' && (
        <div className="card">
          <table className="table-base">
            <thead>
              <tr>
                <th>Lot</th>
                <th>Raw Material</th>
                <th>Supplier</th>
                <th>Warehouse</th>
                <th>Remaining</th>
                <th>Expiry</th>
              </tr>
            </thead>
            <tbody>
              {rawStock?.map((s) => (
                <tr key={s.id}>
                  <td>{s.lotNumber}</td>
                  <td>{s.rawMaterial.name}</td>
                  <td>{s.supplier.name}</td>
                  <td>{s.warehouse.name}</td>
                  <td>
                    {s.quantityRemaining} {s.rawMaterial.unit}
                  </td>
                  <td>{s.expiryDate ? formatDate(s.expiryDate) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
