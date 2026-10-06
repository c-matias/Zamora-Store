import Link from "next/link";
import type { CatalogQuery, } from "@/services/catalog";
import { filterOptions } from "@/services/catalog";
import { t } from "@/lib/i18n/pt-PT";
import { inputClass } from "@/components/forms/Field";

type Options = ReturnType<typeof filterOptions>;

function Select({ id, label, name, value, options }: { id: string; label: string; name: string; value?: string; options: { value: string; label: string }[] }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>
      <select id={id} name={name} defaultValue={value ?? ""} className={inputClass}>
        <option value="">Todos</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

/** GET form: funciona sem JavaScript. `idPrefix` evita IDs duplicados (versão móvel e desktop). */
export function CatalogFilters({ query, options, idPrefix }: { query: CatalogQuery; options: Options; idPrefix: string }) {
  const id = (n: string) => `${idPrefix}-${n}`;
  const same = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));
  return (
    <form action="/products" method="get" className="space-y-4" role="search" aria-label="Filtrar equipamentos">
      {query.category && <input type="hidden" name="category" value={query.category} />}
      <div>
        <label htmlFor={id("q")} className="mb-1 block text-sm font-medium">Pesquisar</label>
        <input id={id("q")} name="q" type="search" defaultValue={query.q} className={inputClass} />
      </div>
      {options.brands.length > 1 && <Select id={id("brand")} label="Marca" name="brand" value={query.brand} options={same(options.brands)} />}
      {options.conditions.length > 1 && <Select id={id("condition")} label="Condição" name="condition" value={query.condition} options={options.conditions.map((c) => ({ value: c, label: t.conditions[c] }))} />}
      {options.rams.length > 0 && <Select id={id("ram")} label="RAM" name="ram" value={query.ram} options={same(options.rams)} />}
      {options.storages.length > 0 && <Select id={id("storage")} label="Armazenamento" name="storage" value={query.storage} options={same(options.storages)} />}
      {options.systems.length > 0 && <Select id={id("os")} label="Sistema operativo" name="os" value={query.os} options={same(options.systems)} />}
      {options.hasPrices && (
        <fieldset>
          <legend className="mb-1 text-sm font-medium">Preço (€)</legend>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor={id("min")}>Preço mínimo</label>
            <input id={id("min")} name="minPrice" inputMode="decimal" placeholder="Mín." defaultValue={query.minPrice !== undefined ? query.minPrice / 100 : ""} className={inputClass} />
            <label className="sr-only" htmlFor={id("max")}>Preço máximo</label>
            <input id={id("max")} name="maxPrice" inputMode="decimal" placeholder="Máx." defaultValue={query.maxPrice !== undefined ? query.maxPrice / 100 : ""} className={inputClass} />
          </div>
        </fieldset>
      )}
      <Select id={id("sort")} label="Ordenar" name="sort" value={query.sort === "recent" ? "" : query.sort} options={[{ value: "price_asc", label: "Preço: do mais baixo" }, { value: "price_desc", label: "Preço: do mais alto" }]} />
      <div className="flex items-center gap-3">
        <button className="rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white hover:bg-navy-800">Aplicar filtros</button>
        <Link href={query.category ? `/products?category=${query.category}` : "/products"} className="text-sm underline">Limpar</Link>
      </div>
    </form>
  );
}
