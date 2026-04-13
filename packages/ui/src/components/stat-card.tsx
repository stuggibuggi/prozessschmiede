interface StatCardProps {
  label: string;
  value: string;
  detail: string;
}

export function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="rounded-[24px] border border-[var(--border-soft)] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
      <p className="text-sm text-[var(--foreground-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">{value}</p>
      <p className="mt-3 text-sm text-[var(--foreground-subtle)]">{detail}</p>
    </div>
  );
}

