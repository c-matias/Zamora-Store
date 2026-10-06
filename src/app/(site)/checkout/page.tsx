import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getProductBySlug } from "@/server/products";
import { resolveCart } from "@/server/cart";
import { getCountry } from "@/lib/country";
import { CheckoutFlow, type CheckoutItem } from "@/components/forms/CheckoutFlow";
import { variantLabel } from "@/services/catalog";

export const metadata: Metadata = { title: "Encomendar", robots: { index: false } };

/** /checkout?product=slug[&variant=id] = encomendar agora um só equipamento; /checkout (sem parâmetros) = carrinho. */
export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ product?: string; variant?: string }> }) {
  const { product: slug, variant: variantId } = await searchParams;
  const country = await getCountry();
  let items: CheckoutItem[];
  let fromCart = false;

  if (slug) {
    const p = await getProductBySlug(slug);
    const v = p?.variants.find((x) => x.id === variantId) ?? p?.variants[0];
    if (!p || !v) notFound();
    items = [{ variantId: v.id, name: p.variants.length > 1 ? `${p.name} — ${variantLabel(v)}` : p.name, qty: 1, pricePT: v.sellingPricePT, priceAO: v.sellingPriceAO }];
  } else {
    const cart = await resolveCart(country);
    if (cart.lines.length === 0) redirect("/cart");
    fromCart = true;
    items = cart.lines.map((l) => ({
      variantId: l.v, qty: l.q, pricePT: l.variant.sellingPricePT, priceAO: l.variant.sellingPriceAO,
      name: l.product.variants.length > 1 ? `${l.product.name} — ${variantLabel(l.variant)}` : l.product.name,
    }));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-semibold text-navy-950">Encomendar</h1>
      <CheckoutFlow items={items} fromCart={fromCart} initialCountry={country} />
    </div>
  );
}
