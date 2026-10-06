"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminDb, errorMessage, UserError } from "@/server/admin";
import { providerFor } from "@/payments";
import { siteConfig } from "@/lib/config";

/** Gera link de pagamento para uma encomenda JÁ CONFIRMADA por uma pessoa. O valor é lido da BD. */
export async function createPaymentLink(formData: FormData) {
  const id = String(formData.get("id"));
  let target = `/admin/orders/${id}?saved=1`;
  try {
    z.string().uuid().parse(id);
    const db = await adminDb();
    const { data: o } = await db.from("orders").select("id, status, payment_status, total, destination, customers(email)").eq("id", id).maybeSingle();
    if (!o) throw new UserError("Encomenda não encontrada.");
    if (o.status !== "confirmed") throw new UserError("Só é possível gerar link de pagamento de encomendas confirmadas.");
    if (o.payment_status === "paid") throw new UserError("A encomenda já está paga.");
    if (!(o.total > 0)) throw new UserError("A encomenda não tem valor definido.");
    const provider = providerFor(o.destination);
    if (!provider) throw new UserError("Sem fornecedor de pagamento configurado para este destino. Combine o pagamento manualmente e marque-o como pago.");
    const email = (o.customers as unknown as { email: string } | null)?.email ?? "";
    const r = await provider.createCheckout({
      orderId: o.id, amount: o.total, currency: "EUR", description: `Encomenda #${o.id.slice(0, 8).toUpperCase()}`, destination: o.destination, customerEmail: email,
      successUrl: `${siteConfig.url}/`, cancelUrl: `${siteConfig.url}/`,
    });
    const { error } = await db.from("orders").update({ payment_provider: r.provider, payment_reference: r.reference, payment_url: r.url }).eq("id", id);
    if (error) throw error;
  } catch (e) { target = `/admin/orders/${id}?error=${encodeURIComponent(errorMessage(e))}`; }
  redirect(target);
}
