import type { Cents } from "@/types/domain";

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

export function formatEuro(cents: Cents): string {
  return eur.format(cents / 100);
}
