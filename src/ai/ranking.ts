import type { Cents, Condition, SupplierAvailability } from "@/types/domain";

/**
 * Ranking INTERNO e consultivo (admin). Nunca altera dados nem compra nada.
 * Dados em falta contam como neutros (0,5) e ficam sinalizados em `missing`.
 */
export interface RankInput {
  id: string; name: string;
  sellingPrice: Cents | null; totalCost: Cents | null;
  ramGb: number | null; storageGb: number | null;
  condition: Condition; availability: SupplierAvailability; shippingCost: Cents | null;
}
export interface Weights { price: number; margin: number; specs: number; condition: number; availability: number; shipping: number }
export const DEFAULT_WEIGHTS: Weights = { price: 0.2, margin: 0.25, specs: 0.2, condition: 0.15, availability: 0.15, shipping: 0.05 };

export interface Ranked { item: RankInput; score: number; parts: Record<keyof Weights, number>; missing: (keyof Weights)[] }

const COND: Record<Condition, number> = { excellent: 1, very_good: 0.75, good: 0.5, acceptable: 0.25 };
const AVAIL: Record<SupplierAvailability, number> = { available: 1, on_request: 0.5, unknown: 0.25, unavailable: 0 };

function norm(values: (number | null)[]): (number | null)[] {
  const xs = values.filter((v): v is number => v !== null);
  if (xs.length === 0) return values.map(() => null);
  const min = Math.min(...xs), max = Math.max(...xs);
  return values.map((v) => (v === null ? null : max === min ? 0.5 : (v - min) / (max - min)));
}

export function rankProducts(items: RankInput[], weights: Weights = DEFAULT_WEIGHTS): Ranked[] {
  const margin = items.map((i) => (i.sellingPrice !== null && i.totalCost !== null ? i.sellingPrice - i.totalCost : null));
  const nPrice = norm(items.map((i) => i.sellingPrice)).map((v) => (v === null ? null : 1 - v));
  const nMargin = norm(margin);
  const nRam = norm(items.map((i) => i.ramGb)), nSto = norm(items.map((i) => i.storageGb));
  const nShip = norm(items.map((i) => i.shippingCost)).map((v) => (v === null ? null : 1 - v));
  const totalW = Object.values(weights).reduce((a, b) => a + b, 0) || 1;

  return items.map((item, idx) => {
    const specVals = [nRam[idx] ?? null, nSto[idx] ?? null].filter((v): v is number => v !== null);
    const raw: Record<keyof Weights, number | null> = {
      price: nPrice[idx] ?? null, margin: nMargin[idx] ?? null,
      specs: specVals.length ? specVals.reduce((a, b) => a + b, 0) / specVals.length : null,
      condition: COND[item.condition], availability: AVAIL[item.availability], shipping: nShip[idx] ?? null,
    };
    const missing = (Object.keys(raw) as (keyof Weights)[]).filter((k) => raw[k] === null);
    const parts = Object.fromEntries((Object.keys(raw) as (keyof Weights)[]).map((k) => [k, raw[k] ?? 0.5])) as Record<keyof Weights, number>;
    const score = (Object.keys(weights) as (keyof Weights)[]).reduce((s, k) => s + parts[k] * weights[k], 0) / totalW * 100;
    return { item, score: Math.round(score * 10) / 10, parts, missing };
  }).sort((a, b) => b.score - a.score);
}
