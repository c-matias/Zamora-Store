import { test } from "node:test";
import assert from "node:assert/strict";
import { filterOptions, filterProducts, paginate, parseCatalogQuery } from "./catalog";
import type { ProductWithVariants } from "../types/domain";

const mk = (slug: string, brand: string, ram: string | null, pt: number | null, os: string | null = null): ProductWithVariants => ({
  id: slug, name: slug, slug, brand, model: slug, category: "laptops", description: "", condition: "good", status: "active",
  images: [], isDemo: true, createdAt: "", updatedAt: "",
  variants: [{ id: slug + "v", productId: slug, cpu: null, ram, storage: null, color: null, os, condition: "good", sellingPricePT: pt, sellingPriceAO: null }],
});
const data = [mk("a", "Dell", "16 GB", 50000), mk("b", "HP", "8 GB", 30000), mk("c", "Dell", "8 GB", null, "macOS")];
const q = (sp: Record<string, string>) => parseCatalogQuery(sp);

test("parse ignora valores inválidos", () => {
  const r = q({ category: "x", page: "-3", sort: "foo", minPrice: "abc" });
  assert.equal(r.category, undefined); assert.equal(r.page, 1); assert.equal(r.sort, "recent"); assert.equal(r.minPrice, undefined);
});
test("filtra por marca e RAM", () => {
  assert.deepEqual(filterProducts(data, q({ brand: "Dell", ram: "8 GB" }), "PT").map((p) => p.slug), ["c"]);
});
test("filtro de preço exclui produtos sem preço e converte euros em cêntimos", () => {
  assert.deepEqual(filterProducts(data, q({ maxPrice: "400" } as never), "PT").map((p) => p.slug), ["b"]);
});
test("ordenação por preço põe 'sob consulta' no fim", () => {
  assert.deepEqual(filterProducts(data, q({ sort: "price_asc" }), "PT").map((p) => p.slug), ["b", "a", "c"]);
});
test("opções só com dados reais", () => {
  const o = filterOptions(data, "PT");
  assert.deepEqual(o.rams, ["8 GB", "16 GB"]); assert.deepEqual(o.systems, ["macOS"]); assert.equal(o.hasPrices, true);
  assert.equal(filterOptions(data, "AO").hasPrices, false);
});
test("paginação", () => {
  const p = paginate([1, 2, 3, 4, 5], 3, 2);
  assert.deepEqual(p, { items: [5], page: 3, totalPages: 3, total: 5 });
  assert.equal(paginate([1], 9, 2).page, 1);
});

import { priceFor, startingPrice, variantLabel } from "./catalog";
test("preço a partir de, com variantes", () => {
  const p = mk("m", "Dell", "8 GB", 30000);
  p.variants.push({ ...p.variants[0]!, id: "m2", ram: "16 GB", sellingPricePT: 45000 });
  p.variants.push({ ...p.variants[0]!, id: "m3", ram: "32 GB", sellingPricePT: null });
  assert.deepEqual(startingPrice(p, "PT"), { cents: 30000, varies: true });
  assert.equal(startingPrice(p, "AO"), null);
  assert.equal(priceFor(p.variants[1]!, "PT"), 45000);
  assert.equal(variantLabel({ ...p.variants[0]!, cpu: "i5", storage: "512 GB SSD", os: "Windows 11 Pro" }), "i5 · 8 GB · 512 GB SSD · Windows 11 Pro");
  assert.equal(variantLabel({ ...p.variants[0]!, ram: null }), "Configuração única");
});
