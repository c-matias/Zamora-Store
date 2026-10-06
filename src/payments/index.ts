import "server-only";
import type { Country } from "@/types/domain";
import type { PaymentProvider } from "./types";
import { stripeProvider } from "./stripe";

/** Fornecedores ativos (os que têm credenciais). Ordem = preferência. */
export function paymentProviders(): PaymentProvider[] {
  return [process.env.STRIPE_SECRET_KEY ? stripeProvider : null].filter((p): p is PaymentProvider => p !== null);
}
export const providerFor = (destination: Country): PaymentProvider | undefined => paymentProviders().find((p) => p.supports(destination));
