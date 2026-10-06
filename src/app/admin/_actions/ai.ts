"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { adminDb, errorMessage, UserError } from "@/server/admin";
import { draftCopy } from "@/server/ai";

/** Gera um rascunho e devolve-o por URL para revisão; NÃO grava nada na base de dados. */
export async function generateDraft(formData: FormData) {
  const id = String(formData.get("id"));
  let target = `/admin/products/${id}`;
  try {
    z.string().uuid().parse(id);
    const db = await adminDb();
    const { data: p } = await db.from("products").select("*, product_variants(*)").eq("id", id).maybeSingle();
    if (!p) throw new UserError("Produto não encontrado.");
    const vs: any[] = p.product_variants ?? [];
    const common = (k: string) => (vs.length > 0 && vs.every((x) => x[k] === vs[0][k]) ? vs[0][k] : null); // só specs iguais em todas as variantes
    const draft = await draftCopy({
      name: p.name, brand: p.brand, model: p.model, category: p.category, condition: p.condition,
      cpu: common("cpu"), ram: common("ram"), storage: common("storage"), os: common("os"), color: common("color"),
    });
    const sp = new URLSearchParams({ draftTitle: draft.title, draftDescription: draft.description, draftSource: draft.source });
    target = `/admin/products/${id}?${sp.toString()}`;
  } catch (e) {
    target = `/admin/products/${id}?error=${encodeURIComponent(errorMessage(e))}`;
  }
  redirect(target);
}
