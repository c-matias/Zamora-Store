import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { emitEvent } from "@/lib/events";
import { calculatePricing } from "@/services/pricing";
import { mergeItems } from "@/services/cart";
import { shortRef } from "./requests";
import type { OrderInput } from "@/lib/validation";

export type OrderResult =
  | { kind: "order"; id: string; ref: string }
  | { kind: "quote"; id: string; ref: string };

export class NotFoundError extends Error {}
/** Encomenda com vários itens em que algum não tem preço no destino escolhido. */
export class UnpricedItemsError extends Error {}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Os preços vêm SEMPRE da base de dados, nunca do cliente.
 * - Todos os itens com preço no destino: cria UMA encomenda (pagamento a confirmar).
 * - Um único item sem preço: cria cotação em rascunho ("encomenda sob consulta") para revisão humana.
 * - Vários itens e algum sem preço: recusa (UnpricedItemsError) — o carrinho só aceita itens com preço.
 * Nunca compra ao fornecedor: isso é uma decisão humana.
 */
export async function createOrderOrQuote(input: OrderInput): Promise<OrderResult> {
  const db = createSupabaseAdminClient();
  const items = mergeItems(input.items);
  const ids = items.map((i) => i.variantId);

  const { data: rows, error: vErr } = await db
    .from("product_variants")
    .select("id, product_id, selling_price_pt, selling_price_ao, products!inner(status)")
    .in("id", ids)
    .eq("products.status", "active");
  if (vErr) throw new Error(`variant lookup: ${vErr.message}`);
  const byId = new Map<string, any>((rows ?? []).map((r: any) => [r.id, r]));
  if (items.some((i) => !byId.has(i.variantId))) throw new NotFoundError("Equipamento não encontrado");

  const unit = (id: string): number | null => {
    const v = byId.get(id);
    return input.destination === "PT" ? v.selling_price_pt : v.selling_price_ao;
  };
  const unpriced = items.filter((i) => unit(i.variantId) == null);
  const single = items.length === 1;
  if (unpriced.length > 0 && !single) throw new UnpricedItemsError("Itens sem preço neste destino");

  const { customer } = input;
  const insertCustomer = async () => {
    const { data, error } = await db.from("customers").insert({
      name: customer.name, email: customer.email, phone: customer.phone,
      country: input.destination, city: customer.city,
      address: customer.address || null, postal_code: customer.postalCode || null,
    }).select("id").single();
    if (error || !data) throw new Error(`customer insert: ${error?.message}`);
    return data.id as string;
  };

  if (unpriced.length > 0) {
    const customerId = await insertCustomer();
    const variant = byId.get(items[0]!.variantId);
    const { data: q, error: qErr } = await db.from("quotes")
      .insert({ customer_id: customerId, product_id: variant.product_id, destination: input.destination, notes: input.notes || null })
      .select("id").single();
    if (qErr || !q) throw new Error(`quote insert: ${qErr?.message}`);
    await emitEvent("quote.created", { source: "product", quoteId: q.id, destination: input.destination });
    return { kind: "quote", id: q.id, ref: shortRef(q.id) };
  }

  // Margem estimada: custo de fornecedor mais baixo conhecido por variante (envio/encargos ficam por confirmar).
  const { data: listings } = await db.from("supplier_listings").select("product_variant_id, supplier_price").in("product_variant_id", ids).not("supplier_price", "is", null);
  const cheapest = new Map<string, number>();
  for (const l of (listings ?? []) as any[]) cheapest.set(l.product_variant_id, Math.min(cheapest.get(l.product_variant_id) ?? Infinity, l.supplier_price));

  let subtotal = 0, margin = 0;
  const orderItems = items.map((i) => {
    const price = unit(i.variantId) as number;
    const line = price * i.quantity;
    subtotal += line;
    const cost = cheapest.get(i.variantId);
    if (cost !== undefined) margin += calculatePricing({ supplierCost: cost * i.quantity }, input.destination, line).grossMargin;
    return { product_variant_id: i.variantId, quantity: i.quantity, unit_price: price };
  });

  const customerId = await insertCustomer();
  const { data: o, error: oErr } = await db.from("orders").insert({
    customer_id: customerId, destination: input.destination,
    subtotal, shipping: 0, taxes_and_fees: 0, total: subtotal, margin, notes: input.notes || null,
  }).select("id").single();
  if (oErr || !o) throw new Error(`order insert: ${oErr?.message}`);

  const { error: iErr } = await db.from("order_items").insert(orderItems.map((it) => ({ ...it, order_id: o.id })));
  if (iErr) {
    await db.from("orders").delete().eq("id", o.id);
    throw new Error(`order items insert: ${iErr.message}`);
  }
  await emitEvent("order.created", { orderId: o.id, destination: input.destination, itemCount: items.length });
  return { kind: "order", id: o.id, ref: shortRef(o.id) };
}
