'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { CenterProvider, useCenterContext } from '@/lib/center-context';
import type { Role } from '@/types';

interface NavItem {
  href: string;
  label: string;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Overview', roles: ['HQ_ADMIN', 'CENTER_OWNER', 'FRONTDESK_STAFF', 'PARENT'] },
  { href: '/dashboard/enrollment', label: 'Enrollment / CRM', roles: ['HQ_ADMIN', 'CENTER_OWNER', 'FRONTDESK_STAFF', 'PARENT'] },
  { href: '/dashboard/billing', label: 'Billing', roles: ['HQ_ADMIN', 'CENTER_OWNER', 'FRONTDESK_STAFF', 'PARENT'] },
  { href: '/dashboard/franchise-fees', label: 'Franchise Fees', roles: ['HQ_ADMIN', 'CENTER_OWNER'] },
  { href: '/dashboard/attendance', label: 'Attendance', roles: ['HQ_ADMIN', 'CENTER_OWNER', 'FRONTDESK_STAFF', 'PARENT'] },
  { href: '/dashboard/incidents', label: 'Incidents', roles: ['HQ_ADMIN', 'CENTER_OWNER', 'FRONTDESK_STAFF', 'PARENT'] },
  { href: '/dashboard/staff', label: 'Staff & HCM', roles: ['HQ_ADMIN', 'CENTER_OWNER', 'FRONTDESK_STAFF'] },
  { href: '/dashboard/payroll', label: 'Payroll', roles: ['HQ_ADMIN', 'CENTER_OWNER'] },
  { href: '/dashboard/inventory', label: 'Inventory', roles: ['HQ_ADMIN', 'CENTER_OWNER', 'FRONTDESK_STAFF'] },
  { href: '/dashboard/reports', label: 'Reports', roles: ['HQ_ADMIN', 'CENTER_OWNER', 'FRONTDESK_STAFF'] },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <CenterProvider>
      <div className="min-h-screen flex">
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="px-4 py-5 border-b border-gray-100">
            <div className="font-bold text-brand-600">🌱 Little Sprouts</div>
            <div className="text-xs text-gray-400 mt-0.5">{user.name} — {user.role.replace('_', ' ')}</div>
          </div>
          <nav className="flex-1 px-2 py-3 space-y-0.5">
            {NAV.filter((item) => item.roles.includes(user.role)).map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>
          <CenterSelector />
          <div className="px-4 py-3 border-t border-gray-100">
            <button className="text-xs text-gray-500 hover:text-red-600" onClick={logout}>
              Sign out
            </button>
          </div>
        </aside>
        <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
      </div>
    </CenterProvider>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`block rounded-md px-3 py-2 text-sm font-medium ${
        active ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}
    </Link>
  );
}

function CenterSelector() {
  const { user } = useAuth();
  const { centers, activeCenterId, setActiveCenterId } = useCenterContext();
  if (!user || user.role === 'PARENT' || centers.length === 0) return null;

  return (
    <div className="px-4 py-3 border-t border-gray-100">
      <label className="label">Center</label>
      <select
        className="input text-xs"
        value={activeCenterId}
        onChange={(e) => setActiveCenterId(e.target.value)}
      >
        {user.role === 'HQ_ADMIN' && <option value="">All centers</option>}
        {centers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
