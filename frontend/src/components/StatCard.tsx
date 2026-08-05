export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}) {
  const toneClasses: Record<string, string> = {
    default: 'text-gray-900',
    warning: 'text-amber-600',
    danger: 'text-red-600',
    success: 'text-bluma-600',
  };

  return (
    <div className="card">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClasses[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
      {description && <p className="text-sm text-gray-500">{description}</p>}
    </div>
  );
}
