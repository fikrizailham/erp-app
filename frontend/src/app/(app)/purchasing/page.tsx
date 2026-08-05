'use client';

import { FormEvent, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { api, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/StatCard';

interface Supplier {
  id: string;
  name: string;
}

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  orderDate: string;
  expectedDate: string | null;
  supplier: { name: string };
  items: { id: string; quantity: string; unitPrice: string; rawMaterial: { name: string } }[];
}

const PO_KEY = '/purchasing/orders';

export default function PurchasingPage() {
  const { data: orders } = useSWR<PurchaseOrder[]>(PO_KEY, api.get);
  const { data: suppliers } = useSWR<Supplier[]>('/suppliers', api.get);
  const { data: rawMaterials } = useSWR<RawMaterial[]>('/raw-materials', api.get);
  const { data: warehouses } = useSWR<{ id: string; name: string; type: string }[]>(
    '/inventory/warehouses',
    api.get,
  );

  const [showForm, setShowForm] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState([{ rawMaterialId: '', quantity: '', unitPrice: '' }]);
  const [error, setError] = useState<string | null>(null);

  function addRow() {
    setItems((prev) => [...prev, { rawMaterialId: '', quantity: '', unitPrice: '' }]);
  }
  function updateRow(idx: number, field: string, value: string) {
    setItems((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/purchasing/orders', {
        supplierId,
        items: items.map((i) => ({
          rawMaterialId: i.rawMaterialId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      });
      setShowForm(false);
      setItems([{ rawMaterialId: '', quantity: '', unitPrice: '' }]);
      mutate(PO_KEY);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create purchase order');
    }
  }

  async function receiveAll(po: PurchaseOrder) {
    const rawWarehouse = warehouses?.find((w) => w.type === 'RAW_MATERIAL');
    if (!rawWarehouse) {
      alert('No Raw Material warehouse configured');
      return;
    }
    try {
      await api.post('/purchasing/goods-receipts', {
        purchaseOrderId: po.id,
        warehouseId: rawWarehouse.id,
        items: po.items.map((i) => ({ purchaseOrderItemId: i.id, quantityReceived: Number(i.quantity) })),
      });
      mutate(PO_KEY);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to receive goods');
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Purchasing" description="Purchase Request → Purchase Order → Goods Receipt → Supplier Invoice." />
        <button className="btn-primary h-fit" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Purchase Order'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card mb-6 space-y-4">
          <div>
            <label className="label">Supplier</label>
            <select required className="input max-w-sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">Select…</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Items</label>
            {items.map((it, idx) => (
              <div key={idx} className="mb-2 flex gap-2">
                <select required className="input" value={it.rawMaterialId} onChange={(e) => updateRow(idx, 'rawMaterialId', e.target.value)}>
                  <option value="">Raw material…</option>
                  {rawMaterials?.map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      {rm.name}
                    </option>
                  ))}
                </select>
                <input required type="number" placeholder="Qty" className="input w-28" value={it.quantity} onChange={(e) => updateRow(idx, 'quantity', e.target.value)} />
                <input required type="number" placeholder="Unit Price" className="input w-32" value={it.unitPrice} onChange={(e) => updateRow(idx, 'unitPrice', e.target.value)} />
              </div>
            ))}
            <button type="button" className="btn-secondary text-xs" onClick={addRow}>
              + Add Item
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" className="btn-primary">
            Create Purchase Order
          </button>
        </form>
      )}

      <div className="card">
        <table className="table-base">
          <thead>
            <tr>
              <th>PO #</th>
              <th>Supplier</th>
              <th>Items</th>
              <th>Status</th>
              <th>Order Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((po) => (
              <tr key={po.id}>
                <td>{po.poNumber}</td>
                <td>{po.supplier.name}</td>
                <td>{po.items.map((i) => i.rawMaterial.name).join(', ')}</td>
                <td>
                  <span className="badge bg-gray-100 text-gray-600">{po.status}</span>
                </td>
                <td>{formatDate(po.orderDate)}</td>
                <td>
                  {po.status !== 'RECEIVED' && po.status !== 'CANCELLED' && (
                    <button className="text-xs text-bluma-600" onClick={() => receiveAll(po)}>
                      Receive Goods
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
