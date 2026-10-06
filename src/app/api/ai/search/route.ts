import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getCountry } from "@/lib/country";
import { interpretSearch } from "@/server/ai";

export const runtime = "nodejs";
const body = z.object({ text: z.string().trim().min(2).max(300) });

export async function POST(req: Request) {
  if (!(await rateLimit(clientKey(req, "ai-search"), 20, 10 * 60_000))) return NextResponse.json({ error: "Demasiados pedidos." }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Texto inválido (2–300 caracteres)." }, { status: 400 });
  const r = await interpretSearch(parsed.data.text, await getCountry());
  const qs = new URLSearchParams(r.params).toString();
  return NextResponse.json({ applied: r.applied, ignored: r.ignored, url: qs ? `/products?${qs}` : "/products" });
}
