import { z } from "zod";
import type { filterOptions } from "@/services/catalog";
import { t } from "@/lib/i18n/pt-PT";

/**
 * Pesquisa em linguagem natural -> filtros estruturados.
 * Duas etapas: (1) extrair intenção (regras, ou LLM opcional), (2) resolver contra os dados reais.
 * Só são aplicados filtros que existem nos dados; o resto é reportado em `ignored`.
 */
export const intentSchema = z.object({
  category: z.enum(["laptops", "smartphones", "tablets", "accessories"]).optional(),
  maxPriceEuros: z.number().int().positive().max(1_000_000).optional(),
  ramGb: z.number().int().positive().max(1024).optional(),
  storageGb: z.number().int().positive().max(16384).optional(),
  brand: z.string().max(60).optional(),
  condition: z.enum(["excellent", "very_good", "good", "acceptable"]).optional(),
  os: z.string().max(40).optional(),
});
export type SearchIntent = z.infer<typeof intentSchema>;
type Options = ReturnType<typeof filterOptions>;

const strip = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const toGb = (n: number, unit: string) => (unit === "tb" ? n * 1024 : n);

export function gbOf(s: string): number | null {
  const m = /(\d+)\s*(gb|tb)/i.exec(s);
  return m ? toGb(Number(m[1]), (m[2] ?? "gb").toLowerCase()) : null;
}

export function extractIntent(text: string, known: { brands?: string[]; systems?: string[] } = {}): SearchIntent {
  const s = strip(text.slice(0, 300));
  const intent: SearchIntent = {};

  if (/\b(portatil|portateis|laptop|notebook|computador)/.test(s)) intent.category = "laptops";
  else if (/\b(telemovel|telemoveis|smartphone|telefone|iphone)/.test(s)) intent.category = "smartphones";
  else if (/\b(tablet|ipad)/.test(s)) intent.category = "tablets";
  else if (/\b(acessorio|carregador|capa|auscultador)/.test(s)) intent.category = "accessories";

  const num = String.raw`(\d{2,5})(?![\d])(?![.,]?\d)(?!\s*(?:gb|tb))`;
  const budget =
    new RegExp(String.raw`(?:ate|max(?:imo)?|menos de|orcamento(?: de)?|budget)\s*(?:de\s*)?(?:€\s*)?${num}`).exec(s) ??
    new RegExp(String.raw`${num}\s*(?:€|euros?|eur)\b`).exec(s) ??
    new RegExp(String.raw`€\s*${num}`).exec(s);
  if (budget?.[1]) intent.maxPriceEuros = Number(budget[1]);

  for (const m of s.matchAll(/(\d{1,4})\s*(gb|tb)\b/g)) {
    const gb = toGb(Number(m[1]), m[2] ?? "gb");
    const end = (m.index ?? 0) + m[0].length;
    const after = s.slice(end), before = s.slice(0, m.index ?? 0);
    const isRam = /^\s*(?:de\s*)?ram\b/.test(after) || /ram\s*(?:de\s*)?$/.test(before);
    const isStorage = /^\s*(?:de\s*)?(?:ssd|hdd|nvme|disco|armazenamento|storage)\b/.test(after) || /(?:armazenamento|storage|ssd|disco)\s*(?:de\s*)?$/.test(before);
    if (isRam && intent.ramGb === undefined) intent.ramGb = gb;
    else if (isStorage && intent.storageGb === undefined) intent.storageGb = gb;
    else if (!isRam && !isStorage) {
      if (gb <= 32 && intent.ramGb === undefined) intent.ramGb = gb;
      else if (gb > 32 && intent.storageGb === undefined) intent.storageGb = gb;
    }
  }

  if (/\bexcelente|como novo\b/.test(s)) intent.condition = "excellent";
  else if (/\bmuito bom\b/.test(s)) intent.condition = "very_good";
  else if (/\bbom estado\b|\bestado bom\b|\bcondicao boa\b/.test(s)) intent.condition = "good";

  intent.brand = known.brands?.find((b) => s.includes(strip(b)));
  intent.os = known.systems?.find((o) => s.includes(strip(o)));
  if (!intent.brand) delete intent.brand;
  if (!intent.os) delete intent.os;
  return intent;
}

export interface ResolvedSearch { params: Record<string, string>; applied: string[]; ignored: string[] }

export function resolveIntent(intent: SearchIntent, options: Options): ResolvedSearch {
  const params: Record<string, string> = {};
  const applied: string[] = [], ignored: string[] = [];

  if (intent.category) { params["category"] = intent.category; applied.push(`Categoria: ${t.categories[intent.category]}`); }
  if (intent.maxPriceEuros !== undefined) {
    if (options.hasPrices) { params["maxPrice"] = String(intent.maxPriceEuros); applied.push(`Preço até ${intent.maxPriceEuros} €`); }
    else ignored.push(`Orçamento de ${intent.maxPriceEuros} € (os preços são confirmados por cotação)`);
  }
  const byGb = (opts: string[], gb: number) => opts.find((o) => gbOf(o) === gb);
  if (intent.ramGb !== undefined) {
    const o = byGb(options.rams, intent.ramGb);
    if (o) { params["ram"] = o; applied.push(`RAM: ${o}`); } else ignored.push(`RAM ${intent.ramGb} GB (sem equipamentos com esta RAM)`);
  }
  if (intent.storageGb !== undefined) {
    const o = byGb(options.storages, intent.storageGb);
    if (o) { params["storage"] = o; applied.push(`Armazenamento: ${o}`); } else ignored.push(`Armazenamento ${intent.storageGb} GB (sem equipamentos)`);
  }
  if (intent.brand) {
    const o = options.brands.find((b) => b.toLowerCase() === intent.brand?.toLowerCase());
    if (o) { params["brand"] = o; applied.push(`Marca: ${o}`); } else ignored.push(`Marca ${intent.brand}`);
  }
  if (intent.condition) {
    if (options.conditions.includes(intent.condition)) { params["condition"] = intent.condition; applied.push(`Condição: ${t.conditions[intent.condition]}`); }
    else ignored.push(`Condição ${t.conditions[intent.condition]}`);
  }
  if (intent.os) {
    const o = options.systems.find((x) => x.toLowerCase() === intent.os?.toLowerCase());
    if (o) { params["os"] = o; applied.push(`Sistema operativo: ${o}`); } else ignored.push(`Sistema operativo ${intent.os}`);
  }
  return { params, applied, ignored };
}
