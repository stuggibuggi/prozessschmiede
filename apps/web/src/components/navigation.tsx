import Link from "next/link";

const navigationItems = [
  ["Dashboard", "/"],
  ["Prozesse", "/processes"],
  ["Suche", "/search"],
  ["Reviews", "/reviews"],
  ["Audit", "/audit"],
  ["Administration", "/admin"]
] as const;

export function Navigation() {
  return (
    <div className="flex h-full flex-col gap-8">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground-muted)]">Prozessschmiede</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">Enterprise BPMN</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--foreground-subtle)]">
          Zentrale Modellierungs- und Governance-Plattform fuer fachliche Prozesse.
        </p>
      </div>
      <nav className="space-y-2">
        {navigationItems.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="block rounded-2xl px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-muted)]"
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-sm text-[var(--foreground-subtle)]">
        <p className="font-medium text-[var(--foreground)]">Governance Ready</p>
        <p className="mt-2 leading-6">Versionierung, Reviews, Audit und Lane Mapping sind im Fundament verankert.</p>
      </div>
    </div>
  );
}
