'use client';

import { FormEvent, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { api, ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/StatCard';

interface Product {
  id: string;
  name: string;
}

interface Recipe {
  id: string;
  name: string;
  productId: string;
}

interface Warehouse {
  id: string;
  name: string;
  type: string;
}

interface ProductionOrder {
  id: string;
  orderNumber: string;
  status: string;
  plannedQuantity: string;
  actualYieldQty: string | null;
  scheduledDate: string;
  product: { name: string };
  batch: { batchNumber: string; expiryDate: string } | null;
}

const ORDERS_KEY = '/production/orders';

export default function ProductionPage() {
  const { data: orders } = useSWR<ProductionOrder[]>(ORDERS_KEY, api.get);
  const { data: products } = useSWR<Product[]>('/products', api.get);
  const { data: warehouses } = useSWR<Warehouse[]>('/inventory/warehouses', api.get);

  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [plannedQuantity, setPlannedQuantity] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));

  const recipesKey = productId ? `/recipes?productId=${productId}` : null;
  const { data: recipes } = useSWR<Recipe[]>(recipesKey, api.get);
  const [recipeId, setRecipeId] = useState('');

  const productionWarehouses = warehouses?.filter((w) => w.type === 'PRODUCTION') ?? [];
  const fgWarehouses = warehouses?.filter((w) => w.type === 'FINISHED_GOODS') ?? [];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/production/orders', {
        productId,
        recipeId,
        warehouseId,
        plannedQuantity: Number(plannedQuantity),
        scheduledDate: new Date(scheduledDate).toISOString(),
      });
      setShowForm(false);
      mutate(ORDERS_KEY);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create production order');
    }
  }

  async function start(id: string) {
    try {
      await api.patch(`/production/orders/${id}/start`);
      mutate(ORDERS_KEY);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to start production');
    }
  }

  async function complete(id: string, plannedQty: string) {
    const actualYieldQty = prompt('Actual yield quantity produced?', plannedQty);
    if (!actualYieldQty) return;
    const finishedGoodsWarehouseId = fgWarehouses[0]?.id;
    if (!finishedGoodsWarehouseId) {
      alert('No Finished Goods warehouse configured');
      return;
    }
    try {
      await api.patch(`/production/orders/${id}/complete`, {
        actualYieldQty: Number(actualYieldQty),
        finishedGoodsWarehouseId,
      });
      mutate(ORDERS_KEY);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to complete production');
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Manufacturing — Production Orders" description="Plan → Order → Ingredient Issue → Production → Finished Goods Receipt." />
        <button className="btn-primary h-fit" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : '+ New Production Order'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
          <div>
            <label className="label">Product</label>
            <select required className="input" value={productId} onChange={(e) => { setProductId(e.target.value); setRecipeId(''); }}>
              <option value="">Select…</option>
              {products?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Recipe</label>
            <select required className="input" value={recipeId} onChange={(e) => setRecipeId(e.target.value)} disabled={!productId}>
              <option value="">Select…</option>
              {recipes?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Production Warehouse</label>
            <select required className="input" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">Select…</option>
              {productionWarehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Planned Quantity</label>
            <input required type="number" className="input" value={plannedQuantity} onChange={(e) => setPlannedQuantity(e.target.value)} />
          </div>
          <div>
            <label className="label">Scheduled Date</label>
            <input required type="date" className="input" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          </div>
          <div className="col-span-full">
            {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
            <button type="submit" className="btn-primary">
              Create Order
            </button>
          </div>
        </form>
      )}

      <div className="card">
        <table className="table-base">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Product</th>
              <th>Planned</th>
              <th>Actual Yield</th>
              <th>Batch</th>
              <th>Status</th>
              <th>Scheduled</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders?.map((o) => (
              <tr key={o.id}>
                <td>{o.orderNumber}</td>
                <td>{o.product.name}</td>
                <td>{o.plannedQuantity}</td>
                <td>{o.actualYieldQty ?? '—'}</td>
                <td>
                  {o.batch ? (
                    <span title={`Expires ${formatDate(o.batch.expiryDate)}`}>{o.batch.batchNumber}</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <span className="badge bg-gray-100 text-gray-600">{o.status}</span>
                </td>
                <td>{formatDate(o.scheduledDate)}</td>
                <td className="space-x-2">
                  {o.status === 'PLANNED' && (
                    <button className="text-xs text-bluma-600" onClick={() => start(o.id)}>
                      Start
                    </button>
                  )}
                  {o.status === 'IN_PROGRESS' && (
                    <button className="text-xs text-bluma-600" onClick={() => complete(o.id, o.plannedQuantity)}>
                      Complete
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
