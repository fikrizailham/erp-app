'use client';

import { Fragment, FormEvent, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useCenterContext } from '@/lib/center-context';
import { useApi } from '@/lib/useApi';
import { api } from '@/lib/api';
import { StatusPill } from '@/components/StatusPill';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Invoice } from '@/types';

export default function BillingPage() {
  const { user } = useAuth();
  const { activeCenterId } = useCenterContext();
  const qs = activeCenterId ? `?centerId=${activeCenterId}` : '';
  const { data, mutate } = useApi<Invoice[]>(`/invoices${qs}`);
  const [expanded, setExpanded] = useState<string | null>(null);
  const canManage = user?.role === 'CENTER_OWNER' || user?.role === 'FRONTDESK_STAFF';

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Billing & Invoices</h1>

      <div className="card overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Period</th>
              <th>Guardian</th>
              <th>Total</th>
              <th>Due date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((inv) => (
              <Fragment key={inv.id}>
                <tr>
                  <td className="font-medium">{inv.period}</td>
                  <td>{inv.billingGuardian?.name ?? '—'}</td>
                  <td>{formatCurrency(inv.total)}</td>
                  <td>{formatDate(inv.dueDate)}</td>
                  <td><StatusPill status={inv.status} /></td>
                  <td>
                    <button
                      className="text-xs text-brand-600 hover:underline"
                      onClick={() => setExpanded(expanded === inv.id ? null : inv.id)}
                    >
                      {expanded === inv.id ? 'Hide' : 'Details'}
                    </button>
                  </td>
                </tr>
                {expanded === inv.id && (
                  <tr>
                    <td colSpan={6} className="bg-gray-50">
                      <InvoiceDetail invoice={inv} canManage={canManage} isParent={user?.role === 'PARENT'} onChanged={mutate} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {data?.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-400 py-6">No invoices yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InvoiceDetail({
  invoice,
  canManage,
  isParent,
  onChanged,
}: {
  invoice: Invoice;
  canManage: boolean;
  isParent: boolean;
  onChanged: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [proofUrl, setProofUrl] = useState('');

  async function recordPayment(e: FormEvent) {
    e.preventDefault();
    await api.post('/payments', { invoiceId: invoice.id, amount: Number(amount), referenceNo: reference });
    setAmount('');
    setReference('');
    onChanged();
  }

  async function uploadProof(e: FormEvent) {
    e.preventDefault();
    await api.post(`/invoices/${invoice.id}/payment-proof`, { paymentProofUrl: proofUrl });
    setProofUrl('');
    onChanged();
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">Line items</p>
        <table className="text-sm w-full">
          <tbody>
            {invoice.lineItems.map((li, i) => (
              <tr key={i}>
                <td className="py-0.5">{li.description}</td>
                <td className="py-0.5 text-right">{li.quantity} × {formatCurrency(li.unitPrice)}</td>
                <td className="py-0.5 text-right font-medium">{formatCurrency(li.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invoice.payments && invoice.payments.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Payments recorded</p>
          {invoice.payments.map((p) => (
            <p key={p.id} className="text-sm">
              {formatCurrency(p.amount)} — ref {p.referenceNo ?? 'n/a'}
              {p.reconciledAt ? ` (reconciled ${formatDate(p.reconciledAt)})` : ''}
            </p>
          ))}
        </div>
      )}

      {isParent && invoice.status !== 'PAID' && (
        <form onSubmit={uploadProof} className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="label">Payment proof URL (upload receipt link)</label>
            <input className="input" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://..." required />
          </div>
          <button type="submit" className="btn-secondary">Submit proof</button>
        </form>
      )}

      {canManage && invoice.status !== 'PAID' && (
        <form onSubmit={recordPayment} className="flex gap-2 items-end">
          <div>
            <label className="label">Amount</label>
            <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <label className="label">Reference no.</label>
            <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">Record Payment</button>
        </form>
      )}
    </div>
  );
}
