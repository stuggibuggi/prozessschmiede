import type { PropsWithChildren, ReactNode } from "react";

interface SplitPaneProps extends PropsWithChildren {
  left: ReactNode;
  right: ReactNode;
  leftWidth?: number;
  rightWidth?: number;
  minHeight?: number;
}

export function SplitPane({ left, right, children, leftWidth = 220, rightWidth = 420, minHeight = 820 }: SplitPaneProps) {
  return (
    <div
      className="grid gap-5"
      style={{
        minHeight,
        gridTemplateColumns: `${leftWidth}px minmax(0, 1fr) ${rightWidth}px`
      }}
    >
      <section className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">{left}</section>
      <section className="rounded-[24px] border border-[var(--border-soft)] bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
        {children}
      </section>
      <section className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">{right}</section>
    </div>
  );
}
