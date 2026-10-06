import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { emitEvent } from "@/lib/events";
import type { CustomRequestInput } from "@/lib/validation";

export const shortRef = (id: string) => id.slice(0, 8).toUpperCase();

export async function createCustomRequest(input: CustomRequestInput): Promise<{ id: string; ref: string }> {
  const db = createSupabaseAdminClient();
  const { customer } = input;

  const { data: c, error: cErr } = await db
    .from("customers")
    .insert({
      name: customer.name, email: customer.email, phone: customer.phone,
      country: customer.country, city: customer.city,
      address: customer.address || null, postal_code: customer.postalCode || null,
    })
    .select("id")
    .single();
  if (cErr || !c) throw new Error(`customer insert: ${cErr?.message}`);

  const { data: r, error: rErr } = await db
    .from("custom_requests")
    .insert({
      customer_id: c.id,
      category: input.category,
      requested_brand: input.brand || null,
      requested_model: input.model || null,
      budget: input.budgetMax ? input.budgetMax * 100 : null,
      specifications: {
        ram: input.ram || null, storage: input.storage || null, cpu: input.cpu || null,
        condition: input.condition, quantity: input.quantity,
      },
      destination: customer.country,
      notes: input.notes || null,
    })
    .select("id")
    .single();
  if (rErr || !r) throw new Error(`request insert: ${rErr?.message}`);

  // Os dados pessoais não vão no evento: só IDs e contexto.
  await emitEvent("quote.created", { source: "custom_request", customRequestId: r.id, destination: customer.country });
  return { id: r.id, ref: shortRef(r.id) };
}
