import { cn } from "../lib/cn";

const tones: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-amber-100 text-amber-700",
  archived: "bg-slate-200 text-slate-600",
  in_review: "bg-blue-100 text-blue-700",
  approved: "bg-teal-100 text-teal-700",
  published: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  pending: "bg-orange-100 text-orange-700",
  returned: "bg-yellow-100 text-yellow-700"
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize tracking-[0.01em]",
        tones[value] ?? "bg-slate-100 text-slate-700"
      )}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

