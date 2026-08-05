import { Sidebar } from '@/components/Sidebar';
import { AuthGuard } from '@/components/AuthGuard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex">
        <Sidebar />
        <main className="min-h-screen flex-1 overflow-y-auto bg-gray-50 p-6">{children}</main>
      </div>
    </AuthGuard>
  );
}
