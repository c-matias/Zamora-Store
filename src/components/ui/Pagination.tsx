import Link from "next/link";

export function Pagination({ page, totalPages, params }: { page: number; totalPages: number; params: Record<string, string> }) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams(params);
    if (p > 1) sp.set("page", String(p)); else sp.delete("page");
    const s = sp.toString();
    return s ? `/products?${s}` : "/products";
  };
  const link = "rounded-md border border-line px-3 py-2 text-sm hover:bg-surface";
  return (
    <nav aria-label="Paginação" className="mt-10 flex items-center justify-center gap-3">
      {page > 1 ? <Link href={href(page - 1)} rel="prev" className={link}>Anterior</Link> : <span className={`${link} opacity-40`} aria-disabled>Anterior</span>}
      <span className="text-sm text-ink-soft" aria-current="page">Página {page} de {totalPages}</span>
      {page < totalPages ? <Link href={href(page + 1)} rel="next" className={link}>Seguinte</Link> : <span className={`${link} opacity-40`} aria-disabled>Seguinte</span>}
    </nav>
  );
}
