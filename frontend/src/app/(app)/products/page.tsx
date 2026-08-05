'use client';

import { FormEvent, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { api, ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { PageHeader } from '@/components/StatCard';

interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  size: string;
  sellingPrice: string;
  shelfLifeDays: number;
  category: string | null;
  status: string;
}

const KEY = '/products';

export default function ProductsPage() {
  const { data: products } = useSWR<Product[]>(KEY, api.get);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    sku: '',
    barcode: '',
    name: '',
    size: '',
    sellingPrice: '',
    shelfLifeDays: '',
    category: '',
  });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(KEY, {
        sku: form.sku,
        barcode: form.barcode || undefined,
        name: form.name,
        size: form.size,
        sellingPrice: Number(form.sellingPrice),
        shelfLifeDays: Number(form.shelfLifeDays),
        category: form.category || undefined,
      });
      setShowForm(false);
      setForm({ sku: '', barcode: '', name: '', size: '', sellingPrice: '', shelfLifeDays: '', category: '' });
      mutate(KEY);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create product');
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Product Management" description="Finished goods catalog — SKU, barcode, size, pricing, shelf life." />
        <button className="btn-primary h-fit" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Product'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <label className="label">SKU</label>
            <input required className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div>
            <label className="label">Barcode</label>
            <input className="input" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </div>
          <div>
            <label className="label">Name</label>
            <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Size</label>
            <input required placeholder="250ml" className="input" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          </div>
          <div>
            <label className="label">Selling Price (IDR)</label>
            <input required type="number" className="input" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
          </div>
          <div>
            <label className="label">Shelf Life (days)</label>
            <input required type="number" className="input" value={form.shelfLifeDays} onChange={(e) => setForm({ ...form, shelfLifeDays: e.target.value })} />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" placeholder="Detox, Green, Mixed…" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <div className="col-span-full">
            {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
            <button type="submit" className="btn-primary">
              Save Product
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <table className="table-base">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Name</th>
              <th>Size</th>
              <th>Category</th>
              <th>Price</th>
              <th>Shelf Life</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {products?.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td>
                <td>{p.name}</td>
                <td>{p.size}</td>
                <td>{p.category ?? '—'}</td>
                <td>{formatCurrency(Number(p.sellingPrice))}</td>
                <td>{p.shelfLifeDays} days</td>
                <td>
                  <span className={`badge ${p.status === 'ACTIVE' ? 'bg-bluma-100 text-bluma-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
