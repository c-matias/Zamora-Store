import type { ReactNode } from "react";

export const th = "px-3 py-2 text-left text-xs font-medium text-ink-mute";
export const td = "px-3 py-2 text-sm";
export const btnPrimary = "rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800 disabled:opacity-60";
export const btnGhost = "rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface";
export const btnDanger = "rounded-md border border-red-700 px-3 py-1.5 text-sm text-red-800 hover:bg-red-50";

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold text-navy-950">{title}</h1>
      {action}
    </div>
  );
}

export function Flash({ error, saved }: { error?: string; saved?: string }) {
  if (error) return <p role="alert" className="mb-4 rounded-md border border-red-700 bg-red-50 p-3 text-sm text-red-800">{error}</p>;
  if (saved) return <p role="status" className="mb-4 rounded-md border border-line bg-navy-50 p-3 text-sm text-navy-900">Guardado.</p>;
  return null;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-ink-soft">{children}</p>;
}

export function DemoBadge() {
  return <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-900">Demo</span>;
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-[640px]">
        <thead className="bg-surface"><tr>{head.map((h) => <th key={h} scope="col" className={th}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export const shortId = (id: string) => id.slice(0, 8).toUpperCase();
export const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-PT");
