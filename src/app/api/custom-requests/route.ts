import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { customRequestSchema, fieldErrors } from "@/lib/validation";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createCustomRequest } from "@/server/requests";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await rateLimit(clientKey(req, "custom-request")))) {
    return NextResponse.json({ error: "Demasiados pedidos. Tente novamente dentro de alguns minutos." }, { status: 429 });
  }
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    const input = customRequestSchema.parse(body);
    if (input.website) return NextResponse.json({ id: "00000000", ref: "00000000" }); // honeypot: fingir sucesso
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "O serviço de pedidos ainda não está configurado." }, { status: 503 });
    }
    const result = await createCustomRequest(input);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Verifique os campos assinalados.", fields: fieldErrors(err) }, { status: 400 });
    console.error("[api/custom-requests]", err);
    return NextResponse.json({ error: "Não foi possível submeter o pedido. Tente novamente." }, { status: 500 });
  }
}
