export function Topbar() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm text-[var(--foreground-muted)]">Finanzkonzern / Prozessgovernance</p>
        <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)]">
          Zentraler Modellierungs- und Freigaberaum
        </p>
      </div>
      <div className="flex items-center gap-3">
        <form action="/search" className="hidden md:block">
          <input
            type="search"
            name="q"
            placeholder="Prozesse, ICTO, Organisationen"
            className="w-72 rounded-full border border-[var(--border-soft)] bg-white px-4 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--foreground)]"
          />
        </form>
        <div className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-sm text-[var(--foreground)]">Entra ID SSO</div>
        <div className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm text-white">Elena Hoffmann</div>
      </div>
    </div>
  );
}
