"use server";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { adminDb, errorMessage, UserError } from "@/server/admin";
import { parseEuroToCents } from "@/lib/money";
import { slugify } from "@/lib/slug";

const opt = z.string().trim().max(120).optional().transform((v) => v || null);
const imageRef = z.string().trim().refine((u) => /^https:\/\//.test(u) || u.startsWith("/"), "As imagens devem ser URLs https ou caminhos a partir de /");
const CONDITION = z.enum(["excellent", "very_good", "good", "acceptable"]);
const maybe = (v: FormDataEntryValue | null) => (v && String(v).trim() ? String(v).trim() : undefined);

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Indique o nome").max(160),
  slug: z.string().trim().max(80).optional(),
  brand: z.string().trim().min(1, "Indique a marca").max(80),
  model: z.string().trim().min(1, "Indique o modelo").max(120),
  category: z.enum(["laptops", "smartphones", "tablets", "accessories"]),
  condition: CONDITION,
  status: z.enum(["draft", "active", "inactive"]),
  description: z.string().trim().max(5000),
  images: z.array(imageRef).max(12),
});

const variantSchema = z.object({
  variantId: z.string().uuid().optional(),
  cpu: opt, ram: opt, storage: opt, color: opt, os: opt,
  condition: CONDITION,
  listingId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  supplierUrl: z.string().trim().url("URL do fornecedor inválido").optional().or(z.literal("").transform(() => undefined)),
  availability: z.enum(["unknown", "available", "unavailable", "on_request"]),
});

type Db = Awaited<ReturnType<typeof adminDb>>;

/** Cria/atualiza uma variante (e a listagem de fornecedor associada, se houver fornecedor). */
async function upsertVariant(db: Db, productId: string, formData: FormData, fallbackCondition?: string) {
  const v = variantSchema.parse({
    variantId: maybe(formData.get("variantId")),
    cpu: formData.get("cpu") ?? undefined, ram: formData.get("ram") ?? undefined, storage: formData.get("storage") ?? undefined,
    color: formData.get("color") ?? undefined, os: formData.get("os") ?? undefined,
    condition: maybe(formData.get("variantCondition")) ?? fallbackCondition,
    listingId: maybe(formData.get("listingId")), supplierId: maybe(formData.get("supplierId")),
    supplierUrl: formData.get("supplierUrl") ?? "", availability: formData.get("availability"),
  });
  const pricePT = parseEuroToCents(formData.get("pricePT"));
  const priceAO = parseEuroToCents(formData.get("priceAO"));
  const supplierPrice = parseEuroToCents(formData.get("supplierPrice"));
  const row = { product_id: productId, cpu: v.cpu, ram: v.ram, storage: v.storage, color: v.color, os: v.os, condition: v.condition, selling_price_pt: pricePT, selling_price_ao: priceAO };

  let variantId = v.variantId;
  if (variantId) {
    const { data, error } = await db.from("product_variants").update(row).eq("id", variantId).eq("product_id", productId).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new UserError("Variante não encontrada neste produto.");
  } else {
    const { data, error } = await db.from("product_variants").insert(row).select("id").single();
    if (error || !data) throw error ?? new Error("variant insert");
    variantId = data.id as string;
  }
  if (v.supplierId) {
    const listing = { supplier_id: v.supplierId, product_variant_id: variantId, supplier_url: v.supplierUrl ?? null, supplier_price: supplierPrice, availability: v.availability, last_checked_at: new Date().toISOString() };
    const { error } = v.listingId ? await db.from("supplier_listings").update(listing).eq("id", v.listingId).eq("product_variant_id", variantId) : await db.from("supplier_listings").insert(listing);
    if (error) throw error;
  }
}

function invalidate() { revalidatePath("/products"); revalidatePath("/"); revalidateTag("products"); }

/** Sem `id`: cria produto + 1.ª variante. Com `id`: atualiza só o produto (as variantes têm formulários próprios). */
export async function saveProduct(formData: FormData) {
  const id = maybe(formData.get("id"));
  const errPath = id ? `/admin/products/${id}` : "/admin/products/new";
  let target = "/admin/products?saved=1";
  try {
    const input = productSchema.parse({
      id, name: formData.get("name"), slug: maybe(formData.get("slug")), brand: formData.get("brand"), model: formData.get("model"),
      category: formData.get("category"), condition: formData.get("condition"), status: formData.get("status"),
      description: String(formData.get("description") ?? ""),
      images: String(formData.get("images") ?? "").split("\n").map((s) => s.trim()).filter(Boolean),
    });
    const slug = slugify(input.slug || input.name);
    if (!slug) throw new UserError("Slug inválido.");
    const db = await adminDb();
    const base = { name: input.name, slug, brand: input.brand, model: input.model, category: input.category, condition: input.condition, status: input.status, description: input.description, images: input.images };
    const dup = (e: { code?: string }) => (e.code === "23505" ? new UserError("Já existe um produto com este slug.") : e);

    if (input.id) {
      const { error } = await db.from("products").update(base).eq("id", input.id);
      if (error) throw dup(error);
    } else {
      const { data, error } = await db.from("products").insert(base).select("id").single();
      if (error || !data) throw error ? dup(error) : new Error("insert");
      try { await upsertVariant(db, data.id as string, formData, input.condition); }
      catch (e) { await db.from("products").delete().eq("id", data.id); throw e; } // não deixar produto sem variante
    }
    invalidate();
  } catch (e) {
    target = `${errPath}?error=${encodeURIComponent(errorMessage(e))}`;
  }
  redirect(target);
}

export async function saveVariant(formData: FormData) {
  let productId = String(formData.get("productId"));
  let target = `/admin/products/${productId}?saved=1`;
  try {
    productId = z.string().uuid().parse(productId);
    await upsertVariant(await adminDb(), productId, formData);
    invalidate();
  } catch (e) { target = `/admin/products/${productId}?error=${encodeURIComponent(errorMessage(e))}`; }
  redirect(target);
}

export async function deleteVariant(formData: FormData) {
  const productId = String(formData.get("productId"));
  let target = `/admin/products/${productId}?saved=1`;
  try {
    const variantId = z.string().uuid().parse(formData.get("variantId"));
    const db = await adminDb();
    const { count } = await db.from("product_variants").select("id", { count: "exact", head: true }).eq("product_id", productId);
    if ((count ?? 0) <= 1) throw new UserError("Um produto precisa de, pelo menos, uma variante.");
    const { error } = await db.from("product_variants").delete().eq("id", variantId).eq("product_id", productId);
    if (error) throw error.code === "23503" ? new UserError("Esta variante tem encomendas associadas e não pode ser apagada.") : error;
    invalidate();
  } catch (e) { target = `/admin/products/${productId}?error=${encodeURIComponent(errorMessage(e))}`; }
  redirect(target);
}

export async function setProductStatus(formData: FormData) {
  let target = "/admin/products?saved=1";
  try {
    const id = z.string().uuid().parse(formData.get("id"));
    const status = formData.get("status") === "active" ? "inactive" : "active";
    const { error } = await (await adminDb()).from("products").update({ status }).eq("id", id);
    if (error) throw error;
    invalidate();
  } catch (e) { target = `/admin/products?error=${encodeURIComponent(errorMessage(e))}`; }
  redirect(target);
}

export async function deleteProduct(formData: FormData) {
  let target = "/admin/products?saved=1";
  try {
    const id = z.string().uuid().parse(formData.get("id"));
    const { error } = await (await adminDb()).from("products").delete().eq("id", id);
    if (error) throw error.code === "23503" ? new UserError("Este produto tem encomendas associadas. Desative-o em vez de o apagar.") : error;
    invalidate();
  } catch (e) { target = `/admin/products?error=${encodeURIComponent(errorMessage(e))}`; }
  redirect(target);
}
