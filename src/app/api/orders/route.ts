import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { fieldErrors, orderSchema, type OrderInput } from "@/lib/validation";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { createOrderOrQuote, NotFoundError, UnpricedItemsError } from "@/server/orders";
import { CART_COOKIE } from "@/server/cart";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await rateLimit(clientKey(req, "order")))) {
    return NextResponse.json({ error: "Demasiados pedidos. Tente novamente dentro de alguns minutos." }, { status: 429 });
  }
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    const input = orderSchema.parse(body) as OrderInput;
    if (input.website) return NextResponse.json({ kind: "order", id: "00000000", ref: "00000000" });
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "O serviço de encomendas ainda não está configurado." }, { status: 503 });
    }
    const result = await createOrderOrQuote(input);
    const res = NextResponse.json(result, { status: 201 });
    if (input.fromCart && result.kind === "order") res.cookies.delete(CART_COOKIE); // encomenda feita: esvaziar carrinho
    return res;
  } catch (err) {
    if (err instanceof ZodError) return NextResponse.json({ error: "Verifique os campos assinalados.", fields: fieldErrors(err) }, { status: 400 });
    if (err instanceof UnpricedItemsError) return NextResponse.json({ error: "Alguns equipamentos não têm preço para este destino. Remova-os do carrinho ou escolha outro destino." }, { status: 422 });
    if (err instanceof NotFoundError) return NextResponse.json({ error: "Este equipamento já não está disponível no catálogo." }, { status: 404 });
    console.error("[api/orders]", err);
    return NextResponse.json({ error: "Não foi possível submeter a encomenda. Tente novamente." }, { status: 500 });
  }
}
