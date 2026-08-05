'use client';

import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/useApi';
import { formatCurrency } from '@/lib/format';

interface FranchiseRollupHQ {
  scope: 'franchise-wide';
  centers: { centerId: string; centerName: string; revenue: number; activeEnrollments: number }[];
}

interface FranchiseRollupOwner {
  scope: 'own-center-with-benchmark';
  ownCenters: { centerId: string; centerName: string; revenue: number; activeEnrollments: number }[];
  franchiseBenchmark: { avgRevenue: number; avgActiveEnrollments: number; centerCount: number };
}

type FranchiseRollup = FranchiseRollupHQ | FranchiseRollupOwner;

export default function ReportsPage() {
  const { user } = useAuth();
  const canSeeRollup = user?.role === 'HQ_ADMIN' || user?.role === 'CENTER_OWNER';
  const { data } = useApi<FranchiseRollup>(canSeeRollup ? '/reports/franchise-rollup' : null);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Reports — Franchise Rollup</h1>

      {!canSeeRollup && (
        <p className="text-gray-500">Franchise-wide reporting is available to HQ Admin and Center Owner roles.</p>
      )}

      {data?.scope === 'franchise-wide' && (
        <div className="card overflow-x-auto">
          <table className="table-base">
            <thead><tr><th>Center</th><th>Revenue (paid)</th><th>Active enrollments</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {data.centers.map((c) => (
                <tr key={c.centerId}>
                  <td className="font-medium">{c.centerName}</td>
                  <td>{formatCurrency(c.revenue)}</td>
                  <td>{c.activeEnrollments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.scope === 'own-center-with-benchmark' && (
        <>
          <div className="card overflow-x-auto">
            <table className="table-base">
              <thead><tr><th>Your Center</th><th>Revenue (paid)</th><th>Active enrollments</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {data.ownCenters.map((c) => (
                  <tr key={c.centerId}>
                    <td className="font-medium">{c.centerName}</td>
                    <td>{formatCurrency(c.revenue)}</td>
                    <td>{c.activeEnrollments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card p-5 max-w-md">
            <p className="text-sm font-semibold mb-3">Franchise Benchmark (anonymized, {data.franchiseBenchmark.centerCount} centers)</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Avg. revenue</span><span className="font-medium">{formatCurrency(data.franchiseBenchmark.avgRevenue)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Avg. active enrollments</span><span className="font-medium">{data.franchiseBenchmark.avgActiveEnrollments}</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
