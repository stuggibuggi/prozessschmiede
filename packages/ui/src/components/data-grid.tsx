import type { ReactNode } from "react";

interface DataGridColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => ReactNode;
}

interface DataGridProps<T> {
  columns: DataGridColumn<T>[];
  rows: T[];
}

export function DataGrid<T extends object>({ columns, rows }: DataGridProps<T>) {
  const getValue = (row: T, key: keyof T | string) => {
    return (row as Record<string, unknown>)[String(key)];
  };

  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-white">
      <table className="min-w-full border-collapse">
        <thead className="bg-[var(--surface-muted)]">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className="px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.08em] text-[var(--foreground-muted)]"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-[var(--border-soft)]">
              {columns.map((column) => (
                <td key={String(column.key)} className="px-4 py-4 text-sm text-[var(--foreground)]">
                  {column.render ? column.render(row) : String(getValue(row, column.key) ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
