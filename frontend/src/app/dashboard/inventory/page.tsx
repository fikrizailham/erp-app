'use client';

import { FormEvent, useState } from 'react';
import { useCenterContext } from '@/lib/center-context';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import type { InventoryCategory, InventoryItem } from '@/types';

export default function InventoryPage() {
  const { activeCenterId } = useCenterContext();
  const qs = activeCenterId ? `?centerId=${activeCenterId}` : '';
  const { data, mutate } = useApi<InventoryItem[]>(`/inventory/items${qs}`);
  const [showForm, setShowForm] = useState(false);
  const [txItem, setTxItem] = useState<InventoryItem | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Inventory</h1>
      <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
        {showForm ? 'Cancel' : '+ New Item'}
      </button>
      {showForm && (
        <NewItemForm centerId={activeCenterId} onCreated={() => { mutate(); setShowForm(false); }} />
      )}

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr><th>Item</th><th>Category</th><th>Stock</th><th>Reorder threshold</th><th>Unit</th><th></th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((item) => {
              const low = Number(item.currentStock) <= Number(item.reorderThreshold);
              return (
                <tr key={item.id} className={low ? 'bg-red-50' : ''}>
                  <td className="font-medium">{item.name}</td>
                  <td>{item.category}</td>
                  <td className={low ? 'text-red-600 font-semibold' : ''}>
                    {item.currentStock} {low && '⚠ Low stock'}
                  </td>
                  <td>{item.reorderThreshold}</td>
                  <td>{item.unit}</td>
                  <td>
                    <button className="text-xs text-brand-600 hover:underline" onClick={() => setTxItem(item)}>
                      Adjust stock
                    </button>
                  </td>
                </tr>
              );
            })}
            {data?.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-6">No inventory items yet</td></tr>}
          </tbody>
        </table>
      </div>

      {txItem && (
        <StockTxForm item={txItem} onDone={() => { mutate(); setTxItem(null); }} onClose={() => setTxItem(null)} />
      )}
    </div>
  );
}

function NewItemForm({ centerId, onCreated }: { centerId: string; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<InventoryCategory>('SUPPLIES');
  const [currentStock, setCurrentStock] = useState('');
  const [reorderThreshold, setReorderThreshold] = useState('');
  const [unit, setUnit] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post('/inventory/items', {
      centerId,
      name,
      category,
      currentStock: Number(currentStock),
      reorderThreshold: Number(reorderThreshold),
      unit,
    });
    onCreated();
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
      <div><label className="label">Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div>
        <label className="label">Category</label>
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value as InventoryCategory)}>
          <option value="FOOD">Food</option>
          <option value="SUPPLIES">Supplies</option>
          <option value="SAFETY">Safety</option>
        </select>
      </div>
      <div><label className="label">Current stock</label><input className="input" type="number" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} required /></div>
      <div><label className="label">Reorder threshold</label><input className="input" type="number" value={reorderThreshold} onChange={(e) => setReorderThreshold(e.target.value)} required /></div>
      <div><label className="label">Unit</label><input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="bag, pack..." required /></div>
      <button type="submit" className="btn-primary">Add Item</button>
    </form>
  );
}

function StockTxForm({ item, onDone, onClose }: { item: InventoryItem; onDone: () => void; onClose: () => void }) {
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/inventory/transactions', { itemId: item.id, type, quantity: Number(quantity), reason });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    }
  }

  return (
    <div className="card p-4 max-w-md">
      <div className="flex justify-between items-center mb-3">
        <p className="font-medium">Adjust stock — {item.name}</p>
        <button className="text-xs text-gray-400" onClick={onClose}>Close</button>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex gap-3">
          <div>
            <label className="label">Type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as 'IN' | 'OUT')}>
              <option value="IN">Stock In</option>
              <option value="OUT">Stock Out</option>
            </select>
          </div>
          <div>
            <label className="label">Quantity</label>
            <input className="input" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="label">Reason</label>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary">Record</button>
      </form>
    </div>
  );
}
