import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const required = (max: number, msg = "Campo obrigatório") => z.string().trim().min(1, msg).max(max);

export const countrySchema = z.enum(["PT", "AO"]);

export const customerSchema = z.object({
  name: required(120, "Indique o seu nome"),
  email: z.string().trim().toLowerCase().email("Email inválido").max(200),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, "Telefone/WhatsApp inválido"),
  country: countrySchema,
  city: required(100, "Indique a cidade"),
  address: text(250).optional(),
  postalCode: text(20).optional(),
});

export const customRequestSchema = z.object({
  category: z.enum(["laptops", "smartphones", "tablets", "accessories"]),
  brand: text(80).optional(),
  model: text(120).optional(),
  budgetMax: z.coerce.number().int().positive().max(1_000_000).optional(),
  ram: text(40).optional(),
  storage: text(40).optional(),
  cpu: text(80).optional(),
  condition: z.enum(["excellent", "very_good", "good", "acceptable", "any"]).default("any"),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
  notes: text(2000).optional(),
  customer: customerSchema,
  website: z.string().optional(), // honeypot
});

export type CustomRequestInput = z.infer<typeof customRequestSchema>;

export const orderItemSchema = z.object({
  variantId: z.string().uuid("Equipamento inválido"),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
});

const orderBase = z.object({
  items: z.array(orderItemSchema).min(1, "Sem equipamentos").max(20),
  destination: countrySchema,
  customer: customerSchema,
  notes: text(1000).optional(),
  fromCart: z.boolean().optional(),
  website: z.string().optional(), // honeypot
});

/** Aceita também o formato antigo de um só item ({ variantId, quantity }). */
export const orderSchema = z.preprocess((raw) => {
  if (raw && typeof raw === "object" && "variantId" in raw && !("items" in raw)) {
    const { variantId, quantity, ...rest } = raw as Record<string, unknown>;
    return { ...rest, items: [{ variantId, quantity }] };
  }
  return raw;
}, orderBase);

export type OrderInput = z.infer<typeof orderBase>;

/** Converte erros zod em mapa "campo.aninhado" -> mensagem. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
