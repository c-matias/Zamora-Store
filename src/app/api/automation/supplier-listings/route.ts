import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySignature } from "@/lib/signature";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Entrada para n8n: atualiza preço/disponibilidade de uma listagem de fornecedor (informação, não ação).
 * Não cria encomendas nem compra nada: a aprovação humana mantém-se entre encomenda do cliente e compra.
 * Autenticação: HMAC-SHA256 de `${X-Timestamp}.${corpo}` com N8N_WEBHOOK_SECRET (falha fechada).
 */
const schema = z.object({
  listingId: z.string().uuid(),
  supplierPrice: z.number().int().min(0).max(100_000_000).optional(),
  availability: z.enum(["unknown", "available", "unavailable", "on_request"]).optional(),
  supplierUrl: z.string().url().max(500).optional(),
}).refine((v) => v.supplierPrice !== undefined || v.availability !== undefined || v.supplierUrl !== undefined, "Nada para atualizar");

export async function POST(req: Request) {
  if (!(await rateLimit(clientKey(req, "automation"), 120, 60_000))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const raw = await req.text();
  const ok = verifySignature({ secret, timestamp: req.headers.get("x-timestamp") ?? "", body: raw, signature: req.headers.get("x-signature") ?? "" });
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let json: unknown;
  try { json = JSON.parse(raw); } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { listingId, supplierPrice, availability, supplierUrl } = parsed.data;
  const update: Record<string, unknown> = { last_checked_at: new Date().toISOString() };
  if (supplierPrice !== undefined) update["supplier_price"] = supplierPrice;
  if (availability !== undefined) update["availability"] = availability;
  if (supplierUrl !== undefined) update["supplier_url"] = supplierUrl;

  const { data, error } = await createSupabaseAdminClient().from("supplier_listings").update(update).eq("id", listingId).select("id").maybeSingle();
  if (error) { console.error("[automation]", error.message); return NextResponse.json({ error: "server_error" }, { status: 500 }); }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
