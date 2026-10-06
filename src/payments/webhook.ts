import "server-only";
import type Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { emitEvent } from "@/lib/events";

/**
 * Processa um evento Stripe já verificado. Idempotente: o id do evento é chave primária em payment_events.
 * Só marca como pago se o valor e a moeda da sessão coincidirem com a encomenda.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handleStripeEvent(event: Stripe.Event): Promise<"processed" | "duplicate" | "ignored"> {
  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") return "ignored";
  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.["orderId"];
  if (!orderId || !UUID.test(orderId) || session.payment_status !== "paid") return "ignored";

  const db = createSupabaseAdminClient();
  const { error: dupErr } = await db.from("payment_events").insert({ id: event.id, provider: "stripe", order_id: orderId, type: event.type });
  if (dupErr) {
    if (dupErr.code === "23505") return "duplicate";
    if (dupErr.code === "23503") { console.error("[stripe] evento para encomenda inexistente", { orderId }); return "ignored"; } // não devolver 500: a Stripe repetiria para sempre
    throw new Error(`payment_events: ${dupErr.message}`);
  }

  const { data: order, error } = await db.from("orders").select("id, total, payment_status").eq("id", orderId).maybeSingle();
  if (error) throw new Error(`order lookup: ${error.message}`);
  if (!order) return "ignored";
  if (session.amount_total !== order.total || session.currency?.toLowerCase() !== "eur") {
    console.error("[stripe] valor/moeda não coincidem com a encomenda", { orderId, amount: session.amount_total, total: order.total });
    return "ignored"; // fica para revisão humana; não marca como pago
  }
  if (order.payment_status !== "paid") {
    const { error: uErr } = await db.from("orders").update({ payment_status: "paid", payment_provider: "stripe", payment_reference: session.id }).eq("id", orderId);
    if (uErr) throw new Error(`order update: ${uErr.message}`);
    await emitEvent("payment.confirmed", { orderId, provider: "stripe" });
  }
  return "processed";
}
