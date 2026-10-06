import { z } from "zod";

/** Lógica pura do carrinho (sem I/O): fácil de testar. O carrinho guarda só IDs e quantidades; preços vêm sempre da BD. */
export const MAX_LINES = 20;
export const MAX_QTY = 10;

export interface CartLine { v: string; q: number }

export class CartError extends Error {}

const lineSchema = z.object({ v: z.string().regex(/^[\w-]{1,80}$/), q: z.number().int().min(1).max(MAX_QTY) });

const clamp = (q: number) => Math.min(MAX_QTY, Math.max(1, Math.trunc(q)));

export function mergeLines(lines: CartLine[]): CartLine[] {
  const out = new Map<string, number>();
  for (const l of lines) out.set(l.v, Math.min(MAX_QTY, (out.get(l.v) ?? 0) + l.q));
  return [...out].map(([v, q]) => ({ v, q }));
}

/** Lê o valor do cookie; qualquer coisa inválida resulta num carrinho vazio. */
export function parseCart(raw: string | undefined | null): CartLine[] {
  if (!raw) return [];
  try {
    const r = z.array(lineSchema).max(MAX_LINES).safeParse(JSON.parse(raw));
    return r.success ? mergeLines(r.data) : [];
  } catch { return []; }
}

export const serializeCart = (lines: CartLine[]): string => JSON.stringify(lines.map(({ v, q }) => ({ v, q })));

export function addLine(lines: CartLine[], v: string, q: number): CartLine[] {
  const existing = lines.find((l) => l.v === v);
  if (!existing && lines.length >= MAX_LINES) throw new CartError("O carrinho está cheio.");
  if (existing) return lines.map((l) => (l.v === v ? { v, q: clamp(l.q + q) } : l));
  return [...lines, { v, q: clamp(q) }];
}

export function setQty(lines: CartLine[], v: string, q: number): CartLine[] {
  if (!Number.isFinite(q) || q < 1) return removeLine(lines, v);
  return lines.map((l) => (l.v === v ? { v, q: clamp(q) } : l));
}

export const removeLine = (lines: CartLine[], v: string): CartLine[] => lines.filter((l) => l.v !== v);

export const cartCount = (lines: CartLine[]): number => lines.reduce((s, l) => s + l.q, 0);

/** Junta linhas repetidas de uma encomenda (soma, com máximo por linha). */
export function mergeItems<T extends { variantId: string; quantity: number }>(items: T[]): { variantId: string; quantity: number }[] {
  const m = new Map<string, number>();
  for (const i of items) m.set(i.variantId, Math.min(MAX_QTY, (m.get(i.variantId) ?? 0) + i.quantity));
  return [...m].map(([variantId, quantity]) => ({ variantId, quantity }));
}
