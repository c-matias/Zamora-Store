"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminDb, errorMessage, UserError } from "@/server/admin";
import { emitEvent } from "@/lib/events";
import { canTransition, eventForTransition } from "@/services/order-status";
import type { OrderStatus } from "@/types/domain";

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending","quote","confirmed","supplier_order","received","quality_check","ready_to_ship","shipped","delivered","cancelled"]),
  paymentStatus: z.enum(["to_confirm","paid","refunded","failed"]),
  shippingStatus: z.enum(["not_shipped","preparing","shipped","delivered"]),
  notes: z.string().trim().max(2000).optional(),
});

export async function updateOrder(formData: FormData) {
  const id = String(formData.get("id"));
  let target = `/admin/orders/${id}?saved=1`;
  try {
    const input = schema.parse({
      id, status: formData.get("status"), paymentStatus: formData.get("paymentStatus"),
      shippingStatus: formData.get("shippingStatus"), notes: formData.get("notes") ?? undefined,
    });
    const db = await adminDb();
    const { data: current, error } = await db.from("orders").select("status, payment_status").eq("id", id).single();
    if (error || !current) throw new UserError("Encomenda não encontrada.");
    const from = current.status as OrderStatus;
    if (from !== input.status && !canTransition(from, input.status)) {
      throw new UserError(`Transição não permitida: ${from} → ${input.status}.`);
    }
    const { error: uErr } = await db.from("orders").update({
      status: input.status, payment_status: input.paymentStatus, shipping_status: input.shippingStatus, notes: input.notes || null,
    }).eq("id", id);
    if (uErr) throw uErr;

    const ev = from !== input.status ? eventForTransition(from, input.status) : null;
    if (ev) await emitEvent(ev, { orderId: id });
    if (current.payment_status !== "paid" && input.paymentStatus === "paid") await emitEvent("payment.confirmed", { orderId: id });
    revalidatePath("/admin");
  } catch (e) {
    target = `/admin/orders/${id}?error=${encodeURIComponent(errorMessage(e))}`;
  }
  redirect(target);
}
