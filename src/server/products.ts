import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { demoProducts } from "./demo-data";
import type { Category, ProductWithVariants } from "@/types/domain";

/**
 * Repositório de produtos.
 * - Com Supabase configurado: lê da BD (cliente anónimo; a RLS só devolve produtos ativos e variantes
 *   sem dados de fornecedor). Resultado em cache 60 s, invalidado pelo admin (tag "products").
 * - Sem Supabase: dados demo para desenvolvimento local.
 */
function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, { auth: { persistSession: false } });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapProduct(r: any): ProductWithVariants {
  return {
    id: r.id, name: r.name, slug: r.slug, brand: r.brand, model: r.model, category: r.category,
    description: r.description, condition: r.condition, status: r.status, images: r.images ?? [],
    isDemo: r.is_demo, createdAt: r.created_at, updatedAt: r.updated_at,
    variants: (r.product_variants ?? []).map((v: any) => ({
      id: v.id, productId: v.product_id, cpu: v.cpu, ram: v.ram, storage: v.storage, color: v.color, os: v.os ?? null,
      condition: v.condition, sellingPricePT: v.selling_price_pt, sellingPriceAO: v.selling_price_ao,
    })),
  };
}

const fetchAll = unstable_cache(
  async (): Promise<ProductWithVariants[]> => {
    const db = publicClient();
    if (!db) return [];
    const { data, error } = await db.from("products").select("*, product_variants(*)").eq("status", "active").order("created_at", { ascending: false }).order("created_at", { referencedTable: "product_variants", ascending: true });
    if (error) throw new Error(`listProducts: ${error.message}`);
    return (data ?? []).map(mapProduct);
  },
  ["products:all"],
  { revalidate: 60, tags: ["products"] },
);

export async function listProducts(filter?: { category?: Category }): Promise<ProductWithVariants[]> {
  const all = publicClient() ? await fetchAll() : demoProducts;
  return all.filter((p) => p.status === "active" && (!filter?.category || p.category === filter.category));
}

export async function getProductBySlug(slug: string): Promise<ProductWithVariants | null> {
  return (await listProducts()).find((p) => p.slug === slug) ?? null;
}
