import { z } from "zod";
import type { Category, Condition, Country, ProductWithVariants, ProductVariant } from "@/types/domain";

export const PAGE_SIZE = 12;

export interface CatalogQuery {
  q?: string; category?: Category; brand?: string; condition?: Condition;
  ram?: string; storage?: string; os?: string;
  minPrice?: number; maxPrice?: number; // cêntimos
  sort: "recent" | "price_asc" | "price_desc";
  page: number;
}

const str = z.string().trim().max(80).optional().transform((v) => v || undefined);
const euros = z.string().trim().regex(/^\d{1,7}([.,]\d{1,2})?$/).optional().catch(undefined)
  .transform((v) => (v ? Math.round(Number(v.replace(",", ".")) * 100) : undefined));

const schema = z.object({
  q: str,
  category: z.enum(["laptops", "smartphones", "tablets", "accessories"]).optional().catch(undefined),
  brand: str,
  condition: z.enum(["excellent", "very_good", "good", "acceptable"]).optional().catch(undefined),
  ram: str, storage: str, os: str,
  minPrice: euros, maxPrice: euros,
  sort: z.enum(["recent", "price_asc", "price_desc"]).catch("recent"),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
});

/** Interpreta searchParams de forma segura: valores inválidos são ignorados. */
export function parseCatalogQuery(sp: Record<string, string | string[] | undefined>): CatalogQuery {
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  return schema.parse(flat) as CatalogQuery;
}

const price = (v: ProductVariant, c: Country) => (c === "PT" ? v.sellingPricePT : v.sellingPriceAO);

export const priceFor = price;

/** Etiqueta legível de uma configuração: "16 GB · 512 GB SSD · Windows 11 Pro". */
export function variantLabel(v: ProductVariant): string {
  return [v.cpu, v.ram, v.storage, v.os, v.color].filter(Boolean).join(" · ") || "Configuração única";
}

/** Preço mais baixo entre as variantes com preço no país; `varies` indica que há preços diferentes. */
export function startingPrice(p: ProductWithVariants, c: Country): { cents: number; varies: boolean } | null {
  const ps = p.variants.map((v) => price(v, c)).filter((x): x is number => x !== null);
  if (ps.length === 0) return null;
  const min = Math.min(...ps);
  return { cents: min, varies: ps.some((x) => x !== min) };
}

function variantMatches(v: ProductVariant, q: CatalogQuery, c: Country): boolean {
  if (q.ram && v.ram !== q.ram) return false;
  if (q.storage && v.storage !== q.storage) return false;
  if (q.os && v.os !== q.os) return false;
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    const p = price(v, c);
    if (p === null) return false;
    if (q.minPrice !== undefined && p < q.minPrice) return false;
    if (q.maxPrice !== undefined && p > q.maxPrice) return false;
  }
  return true;
}

export function filterProducts(products: ProductWithVariants[], q: CatalogQuery, country: Country): ProductWithVariants[] {
  const term = q.q?.toLowerCase();
  const out = products.filter((p) => {
    if (q.category && p.category !== q.category) return false;
    if (q.brand && p.brand !== q.brand) return false;
    if (q.condition && p.condition !== q.condition) return false;
    if (term && !`${p.brand} ${p.model} ${p.name}`.toLowerCase().includes(term)) return false;
    return p.variants.some((v) => variantMatches(v, q, country));
  });
  if (q.sort === "recent") return out;
  const minPrice = (p: ProductWithVariants) => {
    const ps = p.variants.map((v) => price(v, country)).filter((x): x is number => x !== null);
    return ps.length ? Math.min(...ps) : null;
  };
  const dir = q.sort === "price_asc" ? 1 : -1;
  return [...out].sort((a, b) => {
    const pa = minPrice(a), pb = minPrice(b);
    if (pa === null && pb === null) return 0;
    if (pa === null) return 1; // sem preço vai para o fim
    if (pb === null) return -1;
    return (pa - pb) * dir;
  });
}

export function paginate<T>(items: T[], page: number, size = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, totalPages);
  return { items: items.slice((current - 1) * size, current * size), page: current, totalPages, total: items.length };
}

const natural = (a: string, b: string) => (parseInt(a) || 0) - (parseInt(b) || 0) || a.localeCompare(b, "pt");
const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))];

/** Só devolve opções que existem nos dados — nunca filtros vazios. */
export function filterOptions(products: ProductWithVariants[], country: Country) {
  const vs = products.flatMap((p) => p.variants);
  return {
    brands: uniq(products.map((p) => p.brand)).sort((a, b) => a.localeCompare(b, "pt")),
    conditions: uniq(products.map((p) => p.condition)) as Condition[],
    rams: uniq(vs.map((v) => v.ram)).sort(natural),
    storages: uniq(vs.map((v) => v.storage)).sort(natural),
    systems: uniq(vs.map((v) => v.os)).sort((a, b) => a.localeCompare(b, "pt")),
    hasPrices: vs.some((v) => price(v, country) !== null),
  };
}
