export default function Loading() {
  return (
    <div className="mx-auto max-w-page px-4 py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">A carregar equipamentos…</span>
      <div className="h-8 w-64 animate-pulse rounded bg-surface" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-line">
            <div className="aspect-[4/3] animate-pulse bg-surface" />
            <div className="space-y-2 p-4"><div className="h-4 w-1/3 animate-pulse rounded bg-surface" /><div className="h-5 w-2/3 animate-pulse rounded bg-surface" /><div className="h-4 w-1/2 animate-pulse rounded bg-surface" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
