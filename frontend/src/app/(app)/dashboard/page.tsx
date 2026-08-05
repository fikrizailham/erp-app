'use client';

import useSWR from 'swr';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { PageHeader, StatCard } from '@/components/StatCard';

interface Overview {
  sales: {
    today: number;
    todayCount: number;
    thisMonth: number;
    thisMonthCount: number;
    byProduct: { name: string; revenue: number; units: number }[];
    byChannel: { channel: string; revenue: number }[];
  };
  manufacturing: {
    productionToday: number;
    productionOrdersToday: number;
    yieldPct: number | null;
    wasteValueThisMonth: number;
  };
  inventory: {
    rawMaterialUnitsInStock: number;
    expiringFinishedGoods: { expired: number; in3Days: number; in7Days: number };
  };
  finance: { revenue: number; grossProfit: number; netProfit: number };
}

export default function DashboardPage() {
  const { data, isLoading } = useSWR<Overview>('/dashboard/overview', (path: string) => api.get(path), {
    refreshInterval: 60000,
  });

  return (
    <div>
      <PageHeader title="Executive Dashboard" description="Live snapshot of sales, manufacturing, inventory, and finance." />

      {isLoading || !data ? (
        <p className="text-sm text-gray-400">Loading dashboard…</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-500">Sales</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Sales Today" value={formatCurrency(data.sales.today)} hint={`${data.sales.todayCount} transactions`} />
              <StatCard label="Sales This Month" value={formatCurrency(data.sales.thisMonth)} hint={`${data.sales.thisMonthCount} transactions`} />
              <StatCard
                label="Top Channel"
                value={data.sales.byChannel[0]?.channel ?? '—'}
                hint={data.sales.byChannel[0] ? formatCurrency(data.sales.byChannel[0].revenue) : undefined}
              />
              <StatCard
                label="Top Product"
                value={data.sales.byProduct[0]?.name ?? '—'}
                hint={data.sales.byProduct[0] ? formatCurrency(data.sales.byProduct[0].revenue) : undefined}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-500">Manufacturing</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label="Production Today" value={`${data.manufacturing.productionToday} units`} hint={`${data.manufacturing.productionOrdersToday} orders completed`} />
              <StatCard
                label="Yield % (MTD)"
                value={data.manufacturing.yieldPct != null ? `${data.manufacturing.yieldPct.toFixed(1)}%` : '—'}
                tone={data.manufacturing.yieldPct != null && data.manufacturing.yieldPct < 90 ? 'warning' : 'success'}
              />
              <StatCard label="Waste Value (MTD)" value={formatCurrency(data.manufacturing.wasteValueThisMonth)} tone="danger" />
              <StatCard label="Raw Material Stock" value={`${data.inventory.rawMaterialUnitsInStock.toLocaleString()} units`} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-500">Inventory & Expiry</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <StatCard label="Expired Batches" value={String(data.inventory.expiringFinishedGoods.expired)} tone="danger" />
              <StatCard label="Expiring in 3 Days" value={String(data.inventory.expiringFinishedGoods.in3Days)} tone="warning" />
              <StatCard label="Expiring in 7 Days" value={String(data.inventory.expiringFinishedGoods.in7Days)} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-500">Finance (MTD)</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <StatCard label="Revenue" value={formatCurrency(data.finance.revenue)} />
              <StatCard label="Gross Profit" value={formatCurrency(data.finance.grossProfit)} tone="success" />
              <StatCard label="Net Profit" value={formatCurrency(data.finance.netProfit)} tone={data.finance.netProfit >= 0 ? 'success' : 'danger'} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
