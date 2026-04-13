import type { PropsWithChildren, ReactNode } from "react";

interface AppShellProps extends PropsWithChildren {
  sidebar: ReactNode;
  topbar?: ReactNode;
  layout?: "contained" | "wide";
  mainVariant?: "card" | "plain";
}

export function AppShell({ sidebar, topbar, children, layout = "contained", mainVariant = "card" }: AppShellProps) {
  const isWide = layout === "wide";
  const isPlainMain = mainVariant === "plain";

  return (
    <div className="min-h-screen bg-[var(--surface-muted)] text-[var(--foreground)]">
      <div className={`mx-auto flex min-h-screen gap-6 py-6 ${isWide ? "w-full px-4" : "max-w-[1680px] px-6"}`}>
        <aside className="w-72 shrink-0 rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          {sidebar}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {topbar ? (
            <div className="rounded-[24px] border border-white/70 bg-white/85 px-6 py-4 shadow-[0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur">
              {topbar}
            </div>
          ) : null}
          <main
            className={
              isPlainMain
                ? "flex-1 p-0"
                : `flex-1 rounded-[32px] border border-white/70 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur ${isWide ? "p-4" : "p-6"}`
            }
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
