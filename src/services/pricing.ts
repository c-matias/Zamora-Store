import type { Cents, Country } from "@/types/domain";

/**
 * ÚNICO sítio onde a margem é calculada.
 * Todos os valores em cêntimos (inteiros) para evitar erros de vírgula flutuante.
 */
export interface CostInputs {
  supplierCost: Cents;
  supplierShipping: Cents;
  shippingPT: Cents;
  shippingAO: Cents;
  taxesAndFees: Cents;
  paymentFees: Cents;
  otherCosts: Cents;
}

export interface PricingResult {
  /** Envio aplicado ao destino escolhido. */
  shippingApplied: Cents;
  totalCost: Cents;
  sellingPrice: Cents;
  grossMargin: Cents;
  /** Margem sobre o preço de venda, em percentagem (ex.: 12.5). null se preço de venda = 0. */
  marginPercent: number | null;
}

const ZERO: CostInputs = {
  supplierCost: 0, supplierShipping: 0, shippingPT: 0, shippingAO: 0,
  taxesAndFees: 0, paymentFees: 0, otherCosts: 0,
};

function assertCents(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} deve ser um inteiro não negativo (cêntimos); recebido: ${value}`);
  }
}

export function calculateTotalCost(costs: Partial<CostInputs>, destination: Country): { shippingApplied: Cents; totalCost: Cents } {
  const c = { ...ZERO, ...costs };
  for (const [k, v] of Object.entries(c)) assertCents(k, v);
  const shippingApplied = destination === "PT" ? c.shippingPT : c.shippingAO;
  const totalCost = c.supplierCost + c.supplierShipping + shippingApplied + c.taxesAndFees + c.paymentFees + c.otherCosts;
  return { shippingApplied, totalCost };
}

export function calculatePricing(costs: Partial<CostInputs>, destination: Country, sellingPrice: Cents): PricingResult {
  assertCents("sellingPrice", sellingPrice);
  const { shippingApplied, totalCost } = calculateTotalCost(costs, destination);
  const grossMargin = sellingPrice - totalCost;
  const marginPercent = sellingPrice === 0 ? null : Math.round((grossMargin / sellingPrice) * 10000) / 100;
  return { shippingApplied, totalCost, sellingPrice, grossMargin, marginPercent };
}

/** Preço final a partir de uma margem alvo (percentagem sobre o preço de venda, 0 <= m < 100). */
export function priceForTargetMargin(totalCost: Cents, targetMarginPercent: number): Cents {
  assertCents("totalCost", totalCost);
  if (!(targetMarginPercent >= 0 && targetMarginPercent < 100)) {
    throw new RangeError("A margem alvo deve estar entre 0 e 100 (exclusivo).");
  }
  return Math.ceil(totalCost / (1 - targetMarginPercent / 100));
}
