import "server-only";
import Stripe from "stripe";
import type { CheckoutRequest, CheckoutResult, PaymentProvider } from "./types";

let client: Stripe | null = null;
export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return (client ??= new Stripe(key));
}

/**
 * Stripe Checkout. O valor vem SEMPRE da encomenda na BD (nunca do browser).
 * Só é chamado por ação de staff depois da encomenda estar Confirmed (transporte/encargos já acordados).
 * NOTA: a disponibilidade de métodos de pagamento para Angola deve ser validada com a Stripe/conta; a interface permite outro fornecedor.
 */
export const stripeProvider: PaymentProvider = {
  name: "stripe",
  supports: (destination) => destination === "PT",
  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    const stripe = stripeClient();
    if (!stripe) throw new Error("Stripe não configurado");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: req.customerEmail,
      line_items: [{ quantity: 1, price_data: { currency: req.currency.toLowerCase(), unit_amount: req.amount, product_data: { name: req.description } } }],
      metadata: { orderId: req.orderId },
      payment_intent_data: { metadata: { orderId: req.orderId } },
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
    }, { idempotencyKey: `order-${req.orderId}-${req.amount}` });
    if (!session.url) throw new Error("Stripe não devolveu URL de checkout");
    return { provider: "stripe", reference: session.id, url: session.url };
  },
};
