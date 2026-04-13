import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-5 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--foreground-subtle)]">{description}</p>
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}

