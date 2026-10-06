import { NextResponse } from "next/server";
import { stripeClient } from "@/payments/stripe";
import { handleStripeEvent } from "@/payments/webhook";

export const runtime = "nodejs";

/** A assinatura é verificada sobre o corpo CRU. Sem segredo configurado, falha fechada. */
export async function POST(req: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing_signature" }, { status: 400 });

  const raw = await req.text();
  let event;
  try { event = stripe.webhooks.constructEvent(raw, signature, secret); }
  catch { return NextResponse.json({ error: "invalid_signature" }, { status: 400 }); }

  try {
    const result = await handleStripeEvent(event);
    return NextResponse.json({ received: true, result });
  } catch (e) {
    console.error("[webhook/stripe]", e);
    return NextResponse.json({ error: "server_error" }, { status: 500 }); // Stripe volta a tentar
  }
}
