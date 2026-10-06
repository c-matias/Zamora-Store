import { t } from "@/lib/i18n/pt-PT";
import type { Category, Condition } from "@/types/domain";

export interface DescriptionInput {
  name: string; brand: string; model: string; category: Category; condition: Condition;
  cpu?: string | null; ram?: string | null; storage?: string | null; os?: string | null; color?: string | null;
}

export function buildTitleDraft(i: DescriptionInput): string {
  return [`${i.brand} ${i.model}`.trim(), i.ram, i.storage, "Recondicionado"].filter(Boolean).join(" · ");
}

/** Rascunho determinístico (fallback sem LLM): só usa os dados fornecidos. */
export function buildDescriptionDraft(i: DescriptionInput): string {
  const specs = [i.cpu && `processador ${i.cpu}`, i.ram && `${i.ram} de RAM`, i.storage && `armazenamento ${i.storage}`, i.os && `sistema ${i.os}`, i.color && `cor ${i.color}`].filter(Boolean);
  return [
    `${i.name} recondicionado, em condição ${t.conditions[i.condition].toLowerCase()}.`,
    specs.length ? `Especificações: ${specs.join(", ")}.` : "",
    "Equipamento adquirido sob encomenda, sujeito à disponibilidade do fornecedor, e verificado em Portugal antes do envio.",
  ].filter(Boolean).join(" ");
}
