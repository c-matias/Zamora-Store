import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { interpretSearch } from "@/server/ai";
import { listProducts } from "@/server/products";
import { getCountry } from "@/lib/country";
import { ProductCard } from "@/components/ui/ProductCard";
import { CatalogFilters } from "@/components/ui/CatalogFilters";
import { Pagination } from "@/components/ui/Pagination";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/ui/JsonLd";
import { filterOptions, filterProducts, paginate, parseCatalogQuery } from "@/services/catalog";
import { siteConfig } from "@/lib/config";
import { t } from "@/lib/i18n/pt-PT";

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const q = parseCatalogQuery(await searchParams);
  const title = q.category ? t.categories[q.category] : "Equipamentos";
  // Canonical sem filtros/paginação; pesquisas filtradas não são indexadas.
  const filtered = Boolean(q.q || q.brand || q.condition || q.ram || q.storage || q.os || q.minPrice || q.maxPrice || q.page > 1 || q.sort !== "recent");
  return {
    title,
    description: `${title} recondicionados, disponíveis por encomenda para Portugal e Angola.`,
    alternates: { canonical: q.category ? `/products?category=${q.category}` : "/products" },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: SP }) {
  const raw = await searchParams;
  const country = await getCountry();
  const ask = typeof raw["ask"] === "string" ? raw["ask"].trim().slice(0, 300) : "";
  if (ask) {
    const r = await interpretSearch(ask, country);
    const qs = new URLSearchParams(r.params);
    if (qs.size === 0) qs.set("asked", "empty"); else qs.set("asked", "ok");
    redirect(`/products?${qs.toString()}`);
  }
  const query = parseCatalogQuery(raw);
  const askedEmpty = raw["asked"] === "empty";
  const inCategory = await listProducts({ category: query.category });
  const options = filterOptions(inCategory, country);
  const result = paginate(filterProducts(inCategory, query, country), query.page);
  const title = query.category ? t.categories[query.category] : "Equipamentos";

  // Parâmetros ativos (para os links de paginação)
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries({
    category: query.category, q: query.q, brand: query.brand, condition: query.condition, ram: query.ram, storage: query.storage, os: query.os,
    minPrice: query.minPrice !== undefined ? String(query.minPrice / 100) : undefined,
    maxPrice: query.maxPrice !== undefined ? String(query.maxPrice / 100) : undefined,
    sort: query.sort === "recent" ? undefined : query.sort,
  })) if (v) params[k] = v;

  const crumbs = [{ label: "Início", href: "/" }, { label: title }];

  return (
    <div className="mx-auto max-w-page px-4 py-10">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: `${siteConfig.url}${c.href}` } : {}) })),
      }} />
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-4 text-3xl font-semibold text-navy-950">{title}</h1>
      <p className="mt-2 text-sm text-ink-soft">{t.product.availabilityNotice}</p>

      <form action="/products" method="get" role="search" aria-label="Pesquisa por descrição" className="mt-6 flex max-w-2xl gap-2">
        <label htmlFor="ask" className="sr-only">Descreva o que procura</label>
        <input id="ask" name="ask" type="search" maxLength={300} placeholder="Descreva o que procura: portátil até 600 €, 16 GB RAM, 512 GB" className="w-full rounded-md border border-line px-3 py-2 text-sm" />
        <button className="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">Procurar</button>
      </form>
      {askedEmpty && <p role="status" className="mt-3 text-sm text-ink-soft">Não conseguimos converter a descrição em filtros. Use os filtros ou <Link className="underline" href="/request">peça-nos o equipamento</Link>.</p>}

      <div className="mt-8 grid gap-8 md:grid-cols-[16rem,1fr]">
        <aside aria-label="Filtros">
          <details className="rounded-xl border border-line p-4 md:hidden">
            <summary className="cursor-pointer text-sm font-medium">Filtros</summary>
            <div className="mt-4"><CatalogFilters query={query} options={options} idPrefix="m" /></div>
          </details>
          <div className="hidden md:block"><CatalogFilters query={query} options={options} idPrefix="d" /></div>
        </aside>

        <section aria-label="Resultados">
          <p className="mb-4 text-sm text-ink-soft" role="status">{result.total} {result.total === 1 ? "equipamento" : "equipamentos"}</p>
          {result.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-8 text-center">
              <p className="text-ink">Não encontrámos equipamentos com estes critérios.</p>
              <p className="mt-2 text-sm text-ink-soft">Experimente remover filtros ou <Link className="underline" href="/request">peça-nos o equipamento que procura</Link>.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((p) => <ProductCard key={p.id} product={p} country={country} />)}
            </div>
          )}
          <Pagination page={result.page} totalPages={result.totalPages} params={params} />
        </section>
      </div>
    </div>
  );
}
