import type { Cents, Country } from "@/types/domain";

/** Interface comum: permite acrescentar fornecedores adequados a cada mercado (ex.: transferência, multicaixa, etc.). */
export interface CheckoutRequest { orderId: string; amount: Cents; currency: "EUR"; description: string; destination: Country; customerEmail: string; successUrl: string; cancelUrl: string }
export interface CheckoutResult { provider: string; reference: string; url: string }

export interface PaymentProvider {
  name: string;
  /** Mercados em que este fornecedor deve ser oferecido. */
  supports(destination: Country): boolean;
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
}
