import { test } from "node:test";
import assert from "node:assert/strict";
import { extractIntent, resolveIntent } from "./nl-search";
import { findBannedClaims } from "./copy-guard";
import { buildDescriptionDraft } from "./description";
import { answerFaq } from "./faq";
import { rankProducts, type RankInput } from "./ranking";

const options = { brands: ["Dell", "HP"], conditions: ["good", "very_good"] as never[], rams: ["8 GB", "16 GB"], storages: ["256 GB SSD", "512 GB SSD"], systems: ["macOS"], hasPrices: true };

test("pesquisa NL: exemplo da spec", () => {
  const intent = extractIntent("Quero um portátil para programação até 600€, 16GB RAM e 512GB", options);
  assert.deepEqual(intent, { category: "laptops", maxPriceEuros: 600, ramGb: 16, storageGb: 512 });
  const r = resolveIntent(intent, options);
  assert.deepEqual(r.params, { category: "laptops", maxPrice: "600", ram: "16 GB", storage: "512 GB SSD" });
  assert.equal(r.ignored.length, 0);
});
test("pesquisa NL: ordem inversa e marca", () => {
  const i = extractIntent("dell com 512gb ssd e ram 8gb", options);
  assert.equal(i.ramGb, 8); assert.equal(i.storageGb, 512); assert.equal(i.brand, "Dell");
});
test("pesquisa NL: nunca aplica filtros sem dados", () => {
  const r = resolveIntent({ ramGb: 64, maxPriceEuros: 500 }, { ...options, hasPrices: false });
  assert.deepEqual(r.params, {});
  assert.equal(r.ignored.length, 2);
});
test("guarda de conteúdo", () => {
  assert.deepEqual(findBannedClaims("Equipamento sob encomenda, verificado."), []);
  assert.ok(findBannedClaims("O melhor preço, stock limitado e 100% garantido").length >= 3);
  assert.ok(findBannedClaims("Em stock").length === 1);
});
test("rascunho de descrição passa a guarda", () => {
  const d = buildDescriptionDraft({ name: "Dell Latitude 5420", brand: "Dell", model: "Latitude 5420", category: "laptops", condition: "very_good", ram: "16 GB" });
  assert.deepEqual(findBannedClaims(d), []);
  assert.match(d, /sob encomenda/);
});
test("FAQ: responde e faz fallback", () => {
  assert.equal(answerFaq("Vocês entregam em Angola?").faq?.id, "angola");
  assert.equal(answerFaq("Qual a cor do céu?").matched, false);
});
const mk = (id: string, o: Partial<RankInput>): RankInput => ({ id, name: id, sellingPrice: 50000, totalCost: 40000, ramGb: 16, storageGb: 512, condition: "good", availability: "available", shippingCost: 1000, ...o });
test("ranking: margem e disponibilidade pesam; dados em falta sinalizados", () => {
  const r = rankProducts([mk("a", { totalCost: 30000 }), mk("b", { availability: "unavailable" }), mk("c", { totalCost: null })]);
  assert.equal(r[0]?.item.id, "a");
  assert.ok(r.find((x) => x.item.id === "c")?.missing.includes("margin"));
  assert.ok(r.findIndex((x) => x.item.id === "b") > 0);
});
