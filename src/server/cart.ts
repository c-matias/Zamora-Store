import "server-only";
import { cookies } from "next/headers";
import { listProducts } from "@/server/products";
import { parseCart, serializeCart, cartCount, type CartLine } from "@/services/cart";
import { priceFor } from "@/services/catalog";
import type { Country, ProductVariant, ProductWithVariants } from "@/types/domain";

export const CART_COOKIE = "cart";

export async function readCart(): Promise<CartLine[]> {
  return parseCart((await cookies()).get(CART_COOKIE)?.value);
}

export async function writeCart(lines: CartLine[]): Promise<void> {
  const store = await cookies();
  if (lines.length === 0) { store.delete(CART_COOKIE); return; }
  store.set(CART_COOKIE, serializeCart(lines), { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30 });
}

export async function readCartCount(): Promise<number> { return cartCount(await readCart()); }

export interface ResolvedLine { v: string; q: number; product: ProductWithVariants; variant: ProductVariant; unitPrice: number | null }

/** Junta o carrinho (IDs) com os dados atuais do catálogo. Linhas cujo produto já não existe são ignoradas. */
export async function resolveCart(country: Country): Promise<{ lines: ResolvedLine[]; subtotal: number; hasUnpriced: boolean; dropped: number }> {
  const cart = await readCart();
  if (cart.length === 0) return { lines: [], subtotal: 0, hasUnpriced: false, dropped: 0 };
  const products = await listProducts();
  const lines: ResolvedLine[] = [];
  for (const l of cart) {
    const product = products.find((p) => p.variants.some((v) => v.id === l.v));
    const variant = product?.variants.find((v) => v.id === l.v);
    if (product && variant) lines.push({ v: l.v, q: l.q, product, variant, unitPrice: priceFor(variant, country) });
  }
  return {
    lines,
    subtotal: lines.reduce((s, l) => s + (l.unitPrice ?? 0) * l.q, 0),
    hasUnpriced: lines.some((l) => l.unitPrice === null),
    dropped: cart.length - lines.length,
  };
}
