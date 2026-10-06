"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminDb, errorMessage, UserError } from "@/server/admin";
import { emitEvent } from "@/lib/events";
import { parseEuroToCents } from "@/lib/money";
import { calculatePricing, priceForTargetMargin } from "@/services/pricing";

const newSchema = z.object({
  customerId: z.string().uuid("Selecione um cliente"),
  productId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  destination: z.enum(["PT", "AO"]),
});

export async function createQuote(formData: FormData) {
  let target = "/admin/quotes/new";
  try {
    const input = newSchema.parse({ customerId: formData.get("customerId"), productId: formData.get("productId"), destination: formData.get("destination") });
    const db = await adminDb();
    const { data, error } = await db.from("quotes")
      .insert({ customer_id: input.customerId, product_id: input.productId ?? null, destination: input.destination })
      .select("id").single();
    if (error || !data) throw error ?? new Error("insert");
    await emitEvent("quote.created", { source: "admin", quoteId: data.id, destination: input.destination });
    target = `/admin/quotes/${data.id}`;
  } catch (e) {
    target = `/admin/quotes/new?error=${encodeURIComponent(errorMessage(e))}`;
  }
  redirect(target);
}

/** `shipping_cost` = envio total aplicável ao destino (inclui envio do fornecedor, se existir). */
export async function saveQuote(formData: FormData) {
  const id = String(formData.get("id"));
  let target = `/admin/quotes/${id}?saved=1`;
  try {
    const db = await adminDb();
    const { data: q, error } = await db.from("quotes").select("status, destination").eq("id", id).single();
    if (error || !q) throw new UserError("Cotação não encontrada.");
    if (q.status !== "draft") throw new UserError("Só é possível editar cotações em rascunho.");

    const c = (k: string) => parseEuroToCents(formData.get(k)) ?? 0;
    const supplierCost = c("supplierCost"), shipping = c("shippingCost"), taxes = c("taxesAndFees"), pay = c("paymentFees");
    const dest = q.destination as "PT" | "AO";
    const costs = { supplierCost, shippingPT: dest === "PT" ? shipping : 0, shippingAO: dest === "AO" ? shipping : 0, taxesAndFees: taxes, paymentFees: pay };
    const totalCost = calculatePricing(costs, dest, 0).totalCost;

    let finalPrice = parseEuroToCents(formData.get("finalPrice"));
    const targetRaw = String(formData.get("targetMargin") ?? "").trim().replace(",", ".");
    if (finalPrice === null && targetRaw !== "") {
      const pct = Number(targetRaw);
      if (!Number.isFinite(pct)) throw new UserError("Margem alvo inválida.");
      finalPrice = priceForTargetMargin(totalCost, pct);
    }
    finalPrice ??= 0;
    const margin = calculatePricing(costs, dest, finalPrice).grossMargin;

    const { error: uErr } = await db.from("quotes").update({
      supplier_cost: supplierCost, shipping_cost: shipping, taxes_and_fees: taxes, payment_fees: pay,
      margin, final_price: finalPrice, notes: String(formData.get("notes") ?? "").trim() || null,
    }).eq("id", id);
    if (uErr) throw uErr;
  } catch (e) {
    target = `/admin/quotes/${id}?error=${encodeURIComponent(errorMessage(e))}`;
  }
  redirect(target);
}

export async function quoteAction(formData: FormData) {
  const id = String(formData.get("id"));
  const action = String(formData.get("action"));
  let target = `/admin/quotes/${id}?saved=1`;
  try {
    const db = await adminDb();
    const { data: q, error } = await db.from("quotes").select("*").eq("id", id).single();
    if (error || !q) throw new UserError("Cotação não encontrada.");

    if (action === "send") {
      if (q.status !== "draft") throw new UserError("A cotação já foi enviada.");
      if (!(q.final_price > 0)) throw new UserError("Defina o preço final antes de enviar.");
      const expires = new Date(Date.now() + 14 * 86_400_000).toISOString();
      await db.from("quotes").update({ status: "sent", expires_at: q.expires_at ?? expires }).eq("id", id);
    } else if (action === "accept" || action === "reject") {
      if (q.status !== "sent") throw new UserError("Só cotações enviadas podem ser aceites ou rejeitadas.");
      await db.from("quotes").update({ status: action === "accept" ? "accepted" : "rejected" }).eq("id", id);
      if (action === "accept") await emitEvent("quote.accepted", { quoteId: id });
    } else if (action === "convert") {
      if (q.status !== "accepted") throw new UserError("Só cotações aceites podem ser convertidas em pedido.");
      if (!q.product_id) throw new UserError("Associe um produto à cotação antes de converter.");
      const { data: variant } = await db.from("product_variants").select("id").eq("product_id", q.product_id).limit(1).maybeSingle();
      if (!variant) throw new UserError("O produto não tem variantes.");
      const { data: o, error: oErr } = await db.from("orders").insert({
        customer_id: q.customer_id, status: "confirmed", destination: q.destination,
        subtotal: q.final_price - q.shipping_cost - q.taxes_and_fees, shipping: q.shipping_cost, taxes_and_fees: q.taxes_and_fees,
        total: q.final_price, margin: q.margin, notes: q.notes,
      }).select("id").single();
      if (oErr || !o) throw oErr ?? new Error("order insert");
      const { error: iErr } = await db.from("order_items").insert({ order_id: o.id, product_variant_id: variant.id, quantity: 1, unit_price: q.final_price });
      if (iErr) { await db.from("orders").delete().eq("id", o.id); throw iErr; }
      await db.from("quotes").update({ status: "converted" }).eq("id", id);
      await emitEvent("order.created", { orderId: o.id, quoteId: id, destination: q.destination });
      target = `/admin/orders/${o.id}?saved=1`;
    } else {
      throw new UserError("Ação desconhecida.");
    }
    revalidatePath("/admin");
  } catch (e) {
    target = `/admin/quotes/${id}?error=${encodeURIComponent(errorMessage(e))}`;
  }
  redirect(target);
}
