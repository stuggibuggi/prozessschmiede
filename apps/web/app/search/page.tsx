import Link from "next/link";
import { AppShell, PageHeader } from "@prozessschmiede/ui";
import { Navigation } from "../../src/components/navigation";
import { Topbar } from "../../src/components/topbar";
import { searchRepository } from "../../src/lib/api-client";

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const results = query ? await searchRepository(query) : { query: "", strategy: "postgres-ilike", results: [] };

  return (
    <AppShell sidebar={<Navigation />} topbar={<Topbar />}>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Suche"
          title="Repository-Suche"
          description="Suche ueber Prozesse, Teilprozesse, BPMN-Modelle, Anwendungen und Organisationen."
        />
        <div className="rounded-[28px] border border-[var(--border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <p className="text-sm text-[var(--foreground-subtle)]">
            Suchbegriff: <span className="font-medium text-[var(--foreground)]">{query || "noch keiner"}</span>
          </p>
          <p className="mt-2 text-sm text-[var(--foreground-subtle)]">
            Treffer: {results.results.length} | Strategie: {results.strategy}
          </p>
        </div>

        <div className="space-y-4">
          {results.results.length === 0 ? (
            <div className="rounded-[28px] border border-[var(--border-soft)] bg-white p-6 text-sm text-[var(--foreground-subtle)] shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
              Keine Treffer gefunden oder noch kein Suchbegriff eingegeben.
            </div>
          ) : (
            results.results.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                href={result.href}
                className="block rounded-[28px] border border-[var(--border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] transition hover:border-[var(--foreground)]/20"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">{result.type}</p>
                    <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)]">{result.title}</h2>
                    <p className="mt-2 text-sm text-[var(--foreground-subtle)]">{result.subtitle}</p>
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)]">Oeffnen</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
