'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/format';
import { PageHeader, StatCard } from '@/components/StatCard';

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  sourceType: string;
  description: string | null;
  lines: { debit: string; credit: string; account: { code: string; name: string } }[];
}

interface PnL {
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  netProfit: number;
}

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function AccountingPage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const { data: pnl } = useSWR<PnL>(`/accounting/reports/profit-and-loss?from=${from}&to=${to}`, api.get);
  const { data: entries } = useSWR<JournalEntry[]>('/accounting/journal-entries', api.get);

  return (
    <div className="space-y-6">
      <PageHeader title="Accounting" description="Auto-generated journals from purchasing, production, sales, and waste — plus core financial reports." />

      <div className="card">
        <div className="mb-4 flex items-end gap-4">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {pnl && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <StatCard label="Revenue" value={formatCurrency(pnl.revenue)} />
            <StatCard label="COGS" value={formatCurrency(pnl.cogs)} />
            <StatCard label="Gross Profit" value={formatCurrency(pnl.grossProfit)} tone="success" />
            <StatCard label="Operating Expenses" value={formatCurrency(pnl.operatingExpenses)} />
            <StatCard label="Net Profit" value={formatCurrency(pnl.netProfit)} tone={pnl.netProfit >= 0 ? 'success' : 'danger'} />
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="mb-2 text-sm font-semibold">Journal Entries</h3>
        <table className="table-base">
          <thead>
            <tr>
              <th>Entry #</th>
              <th>Date</th>
              <th>Source</th>
              <th>Description</th>
              <th>Debit</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            {entries?.slice(0, 50).map((e) => (
              <tr key={e.id}>
                <td>{e.entryNumber}</td>
                <td>{formatDate(e.date)}</td>
                <td>{e.sourceType}</td>
                <td>{e.description}</td>
                <td>
                  {e.lines
                    .filter((l) => Number(l.debit) > 0)
                    .map((l) => `${l.account.name} ${formatCurrency(Number(l.debit))}`)
                    .join(', ')}
                </td>
                <td>
                  {e.lines
                    .filter((l) => Number(l.credit) > 0)
                    .map((l) => `${l.account.name} ${formatCurrency(Number(l.credit))}`)
                    .join(', ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
