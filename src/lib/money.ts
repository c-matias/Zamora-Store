import type { Cents } from "@/types/domain";

export class MoneyError extends Error {}

/** "1234,50" | "1234.50" | "" -> cêntimos | null (vazio). Lança MoneyError se inválido. */
export function parseEuroToCents(input: FormDataEntryValue | null | undefined): Cents | null {
  const raw = String(input ?? "").trim().replace(/\s/g, "").replace("€", "");
  if (raw === "") return null;
  if (!/^\d+([.,]\d{1,2})?$/.test(raw)) throw new MoneyError(`Valor inválido: "${raw}"`);
  return Math.round(Number(raw.replace(",", ".")) * 100);
}

export const centsToInput = (c: Cents | null | undefined): string => (c === null || c === undefined ? "" : (c / 100).toFixed(2));
