const COLORS: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700',
  ACTIVE: 'bg-green-100 text-green-700',
  OK: 'bg-green-100 text-green-700',
  ENROLLED: 'bg-green-100 text-green-700',
  UNPAID: 'bg-amber-100 text-amber-700',
  LEAD: 'bg-amber-100 text-amber-700',
  TOUR_SCHEDULED: 'bg-blue-100 text-blue-700',
  WAITLISTED: 'bg-purple-100 text-purple-700',
  PENDING: 'bg-amber-100 text-amber-700',
  EXPIRING_SOON: 'bg-amber-100 text-amber-700',
  OVERDUE: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-red-100 text-red-700',
  LOST: 'bg-gray-100 text-gray-600',
  ENDED: 'bg-gray-100 text-gray-600',
  PAUSED: 'bg-gray-100 text-gray-600',
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`badge ${COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
