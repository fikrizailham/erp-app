'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { api, ApiError } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader } from '@/components/StatCard';

interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  size: string;
  sellingPrice: string;
}

interface Warehouse {
  id: string;
  name: string;
  type: string;
}

interface CartLine {
  product: Product;
  quantity: number;
}

interface ReceiptItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  batchNumber: string;
  productionDate: string;
  expiryDate: string;
}

interface Receipt {
  saleNumber: string;
  createdAt: string;
  items: ReceiptItem[];
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
}

const PAYMENT_METHODS = ['CASH', 'QRIS', 'EWALLET', 'CARD', 'BANK_TRANSFER'];

export default function PosPage() {
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: warehouses } = useSWR<Warehouse[]>('/inventory/warehouses?type=OUTLET', api.get);
  const { data: results } = useSWR<Product[]>(
    query.length > 0 ? `/pos/products/search?q=${encodeURIComponent(query)}` : null,
    api.get,
  );

  useEffect(() => {
    if (warehouses && warehouses.length > 0 && !warehouseId) setWarehouseId(warehouses[0].id);
  }, [warehouses, warehouseId]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { product, quantity: 1 }];
    });
    setQuery('');
  }

  function updateQty(productId: string, quantity: number) {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.product.id !== productId)
        : prev.map((l) => (l.product.id === productId ? { ...l, quantity } : l)),
    );
  }

  const subtotal = cart.reduce((sum, l) => sum + Number(l.product.sellingPrice) * l.quantity, 0);

  async function checkout() {
    setError(null);
    setSubmitting(true);
    try {
      const sale = await api.post<{ id: string }>('/pos/sales', {
        warehouseId,
        paymentMethod,
        items: cart.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      });
      const fullReceipt = await api.get<Receipt>(`/pos/sales/${sale.id}/receipt`);
      setReceipt(fullReceipt);
      setCart([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (receipt) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title="Receipt" description={receipt.saleNumber} />
        <div className="card font-mono text-xs">
          <p className="text-center text-sm font-semibold">Bluma Juice Cold Press</p>
          <p className="text-center text-gray-400">{formatDate(receipt.createdAt)}</p>
          <hr className="my-2 border-dashed" />
          {receipt.items.map((item, idx) => (
            <div key={idx} className="mb-2">
              <div className="flex justify-between">
                <span>
                  {item.productName} x{item.quantity}
                </span>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
              <p className="text-gray-400">
                Batch {item.batchNumber} · Prod {formatDate(item.productionDate)} · Exp {formatDate(item.expiryDate)}
              </p>
            </div>
          ))}
          <hr className="my-2 border-dashed" />
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(receipt.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{formatCurrency(receipt.discountAmount)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span>Total ({receipt.paymentMethod})</span>
            <span>{formatCurrency(receipt.totalAmount)}</span>
          </div>
        </div>
        <button className="btn-primary mt-4 w-full" onClick={() => setReceipt(null)}>
          New Sale
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="POS Terminal" description="Barcode scan, product search, and checkout with FEFO batch allocation." />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="card mb-4">
            <label className="label">Scan barcode or search product</label>
            <input
              autoFocus
              className="input"
              placeholder="Scan barcode / SKU / product name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {results && results.length > 0 && (
              <div className="mt-2 divide-y rounded-lg border border-gray-100">
                {results.map((p) => (
                  <button
                    key={p.id}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={() => addToCart(p)}
                  >
                    <span>
                      {p.name} ({p.size})
                    </span>
                    <span className="text-gray-400">{formatCurrency(Number(p.sellingPrice))}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">
                      Cart is empty — scan or search a product to begin.
                    </td>
                  </tr>
                )}
                {cart.map((line) => (
                  <tr key={line.product.id}>
                    <td>
                      {line.product.name} ({line.product.size})
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        className="input w-16"
                        value={line.quantity}
                        onChange={(e) => updateQty(line.product.id, Number(e.target.value))}
                      />
                    </td>
                    <td>{formatCurrency(Number(line.product.sellingPrice))}</td>
                    <td>{formatCurrency(Number(line.product.sellingPrice) * line.quantity)}</td>
                    <td>
                      <button className="text-xs text-red-500" onClick={() => updateQty(line.product.id, 0)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card h-fit">
          <h3 className="mb-3 text-sm font-semibold">Checkout</h3>
          <div className="mb-3">
            <label className="label">Outlet</label>
            <select className="input" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              {warehouses?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="label">Payment Method</label>
            <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3 flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={cart.length === 0 || !warehouseId || submitting} onClick={checkout}>
            {submitting ? 'Processing…' : 'Charge & Print Receipt'}
          </button>
        </div>
      </div>
    </div>
  );
}
