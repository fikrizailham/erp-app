'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [{ href: '/dashboard', label: 'Executive Dashboard', icon: '📊' }],
  },
  {
    title: 'Sales',
    items: [
      { href: '/pos', label: 'POS Terminal', icon: '🧾' },
      { href: '/customers', label: 'Customers & CRM', icon: '👥' },
      { href: '/subscriptions', label: 'Subscriptions', icon: '🔁' },
      { href: '/delivery', label: 'Delivery', icon: '🚚' },
    ],
  },
  {
    title: 'Manufacturing',
    items: [
      { href: '/products', label: 'Products', icon: '🍶' },
      { href: '/bom', label: 'Recipes (BOM)', icon: '📋' },
      { href: '/production', label: 'Production Orders', icon: '🏭' },
      { href: '/batches', label: 'Batch & Expiry Tracking', icon: '⏳' },
    ],
  },
  {
    title: 'Supply Chain',
    items: [
      { href: '/inventory', label: 'Inventory', icon: '📦' },
      { href: '/purchasing', label: 'Purchasing', icon: '🛒' },
      { href: '/waste', label: 'Waste Management', icon: '🗑️' },
    ],
  },
  {
    title: 'Finance',
    items: [{ href: '/accounting', label: 'Accounting', icon: '💰' }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bluma-500 text-sm font-bold text-white">
          B
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Bluma Juice</p>
          <p className="text-xs text-gray-400 leading-tight">Cold Press ERP</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {section.title}
            </p>
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                    active ? 'bg-bluma-50 font-medium text-bluma-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-100 px-4 py-3">
        <p className="truncate text-xs font-medium text-gray-700">{user?.email}</p>
        <p className="mb-2 text-[11px] text-gray-400">{user?.role}</p>
        <button onClick={logout} className="btn-secondary w-full text-xs">
          Sign out
        </button>
      </div>
    </aside>
  );
}
