import type { ReactNode } from "react";
import { StatusBadge } from "@prozessschmiede/ui";

interface ModelerShellProps {
  title: string;
  versionLabel: string;
  status: string;
  lockOwner?: string | undefined;
  canvas?: ReactNode;
  inspector?: ReactNode;
  paletteInfo?: ReactNode;
}

export function ModelerShell({ title, versionLabel, status, lockOwner, canvas, inspector, paletteInfo }: ModelerShellProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between rounded-[24px] border border-[var(--border-soft)] bg-white p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Modeling Workspace</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">{title}</h2>
          <p className="mt-2 text-sm text-[var(--foreground-subtle)]">
            Version {versionLabel} {lockOwner ? `| Checked out by ${lockOwner}` : "| No active lock"}
          </p>
        </div>
        <StatusBadge value={status} />
      </div>
      <div className="grid min-h-[860px] grid-cols-[minmax(0,1fr)_440px] gap-5">
        <section className="rounded-[24px] border border-[var(--border-soft)] bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
          {canvas ?? (
            <div className="flex h-full min-h-[760px] items-center justify-center rounded-[20px] border border-dashed border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(244,247,251,0.8)_0%,rgba(255,255,255,1)_100%)]">
              <div className="max-w-sm text-center">
                <p className="text-sm uppercase tracking-[0.16em] text-[var(--foreground-muted)]">BPMN Canvas</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                  `bpmn-js` integration shell
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--foreground-subtle)]">
                  The canvas host, palette frame, properties zone and lane inspector are in place so the next iteration can wire the real modeler instance.
                </p>
              </div>
            </div>
          )}
        </section>
        <aside className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white bg-white/80 p-3 text-sm text-[var(--foreground-subtle)]">
              <p className="font-medium text-[var(--foreground)]">Palette</p>
              <p className="mt-2 leading-6">
                Die echte `bpmn-js`-Werkzeugpalette liegt direkt im Canvas und kann am Handle <span className="font-medium text-[var(--foreground)]">Toolbox</span> verschoben werden.
              </p>
              {paletteInfo ?? null}
            </div>
            {inspector ?? (
              <div className="rounded-2xl border border-white bg-white/80 p-3 text-sm text-[var(--foreground-subtle)]">
                Waehle ein BPMN-Element aus, um Eigenschaften und Zuordnungen zu bearbeiten.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
