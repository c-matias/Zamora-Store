import { NextResponse } from "next/server";
import { z } from "zod";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { answerFaq } from "@/ai/faq";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

export const runtime = "nodejs";
const body = z.object({ question: z.string().trim().min(2).max(300) });

/** Só responde com a base de conhecimento verificada; sem correspondência, encaminha para contacto humano. */
export async function POST(req: Request) {
  if (!(await rateLimit(clientKey(req, "ai-support"), 20, 10 * 60_000))) return NextResponse.json({ error: "Demasiados pedidos." }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Pergunta inválida (2–300 caracteres)." }, { status: 400 });
  const r = answerFaq(parsed.data.question);
  if (r.matched && r.faq) return NextResponse.json({ matched: true, question: r.faq.question, answer: r.faq.answer });
  return NextResponse.json({
    matched: false,
    answer: "Não temos uma resposta pronta para esta pergunta. Fale connosco para o ajudarmos.",
    contact: whatsappLink(whatsappMessages.general()) ?? "/request",
  });
}
