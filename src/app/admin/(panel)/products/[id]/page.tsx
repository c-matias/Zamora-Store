import { notFound } from "next/navigation";
import { adminDb } from "@/server/admin";
import { ProductForm } from "../../../_components/ProductForm";
import { PageHeader, Flash, btnGhost, btnPrimary, btnDanger } from "../../../_components/ui";
import { generateDraft } from "../../../_actions/ai";
import { saveVariant, deleteVariant } from "../../../_actions/products";
import { VariantFields } from "../../../_components/VariantFields";
import { ConfirmButton } from "../../../_components/ConfirmButton";
import { variantLabel } from "@/services/catalog";


export const dynamic = "force-dynamic";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; draftTitle?: string; draftDescription?: string; draftSource?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const db = await adminDb();
  const { data: product } = await db.from("products").select("*, product_variants(*)").eq("id", id).maybeSingle();
  if (!product) notFound();
  const variants: any[] = [...(product.product_variants ?? [])].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const [{ data: suppliers }, { data: listingRows }] = await Promise.all([
    db.from("suppliers").select("id, name").order("name"),
    variants.length ? db.from("supplier_listings").select("*").in("product_variant_id", variants.map((v) => v.id)).order("last_checked_at", { ascending: false }) : Promise.resolve({ data: [] as any[] }),
  ]);
  const listingOf = (variantId: string) => (listingRows ?? []).find((l: any) => l.product_variant_id === variantId);
  const toLabel = (v: any) => variantLabel({ cpu: v.cpu, ram: v.ram, storage: v.storage, os: v.os, color: v.color } as any);
  const draft = sp.draftDescription?.slice(0, 1200);
  return (
    <>
      <PageHeader title={product.name} action={<form action={generateDraft}><input type="hidden" name="id" value={product.id} /><button className={btnGhost}>Gerar rascunho de descrição</button></form>} />
      <Flash error={sp.error} />
      {draft && (
        <div role="status" className="mb-6 max-w-3xl rounded-xl border border-line bg-navy-50 p-4 text-sm text-navy-900">
          <p className="font-medium">Rascunho gerado ({sp.draftSource === "llm" ? "IA" : "modelo"}) — reveja antes de guardar.</p>
          {sp.draftTitle && <p className="mt-1">Título sugerido: <strong>{sp.draftTitle.slice(0, 200)}</strong></p>}
          <p className="mt-1">A descrição abaixo foi preenchida no formulário, mas só é publicada quando clicar em “Guardar produto”.</p>
        </div>
      )}
      <ProductForm product={product} suppliers={suppliers ?? []} draftDescription={draft} />

      <h2 className="mt-12 text-xl font-semibold text-navy-950">Variantes ({variants.length})</h2>
      <p className="mb-4 mt-1 text-sm text-ink-soft">Cada configuração (RAM, armazenamento, etc.) tem o seu preço e fornecedor. A loja mostra o preço mais baixo e permite escolher a configuração.</p>
      <div className="max-w-3xl space-y-3">
        {variants.map((v, i) => (
          <details key={v.id} className="rounded-xl border border-line p-4" open={variants.length === 1}>
            <summary className="cursor-pointer font-medium">{i + 1}. {toLabel(v)}</summary>
            <form action={saveVariant} className="mt-4 grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="productId" value={product.id} />
              <VariantFields p={`v${i}`} variant={v} listing={listingOf(v.id)} suppliers={suppliers ?? []} withCondition />
              <div className="sm:col-span-2"><button className={btnPrimary}>Guardar variante</button></div>
            </form>
            <form action={deleteVariant} className="mt-3">
              <input type="hidden" name="productId" value={product.id} /><input type="hidden" name="variantId" value={v.id} />
              <ConfirmButton className={btnDanger} message="Apagar esta variante?">Apagar variante</ConfirmButton>
            </form>
          </details>
        ))}
        <details className="rounded-xl border border-dashed border-line p-4">
          <summary className="cursor-pointer font-medium">+ Adicionar variante</summary>
          <form action={saveVariant} className="mt-4 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="productId" value={product.id} />
            <VariantFields p="add" suppliers={suppliers ?? []} withCondition />
            <div className="sm:col-span-2"><button className={btnPrimary}>Adicionar variante</button></div>
          </form>
        </details>
      </div>
    </>
  );
}
