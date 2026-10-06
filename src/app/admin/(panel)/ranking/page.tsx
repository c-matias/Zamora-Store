import { adminDb } from "@/server/admin";
import { rankProducts, type RankInput } from "@/ai/ranking";
import { calculateTotalCost } from "@/services/pricing";
import { gbOf } from "@/ai/nl-search";
import { variantLabel } from "@/services/catalog";
import { formatEuro } from "@/lib/format";
import { PageHeader, Empty, Table, td, DemoBadge } from "../../_components/ui";

export const dynamic = "force-dynamic";

const LABELS = { price: "Preço", margin: "Margem", specs: "Specs", condition: "Condição", availability: "Disponib.", shipping: "Envio" } as const;

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ dest?: string }> }) {
  const { dest } = await searchParams;
  const destination = dest === "AO" ? "AO" : "PT";
  const db = await adminDb();
  const { data, error } = await db.from("product_variants")
    .select("id, cpu, ram, storage, os, color, selling_price_pt, selling_price_ao, condition, products!inner(name, status, is_demo), supplier_listings(supplier_price, availability)")
    .eq("products.status", "active");
  if (error) throw error;

  const demo = new Set<string>();
  const items: RankInput[] = (data ?? []).map((v: any) => {
    const listing = (v.supplier_listings ?? []).filter((l: any) => l.supplier_price !== null).sort((a: any, b: any) => a.supplier_price - b.supplier_price)[0] ?? v.supplier_listings?.[0];
    if (v.products?.is_demo) demo.add(v.id);
    return {
      id: v.id, name: `${v.products?.name ?? "—"} — ${variantLabel({ cpu: v.cpu, ram: v.ram, storage: v.storage, os: v.os, color: v.color } as any)}`,
      sellingPrice: destination === "PT" ? v.selling_price_pt : v.selling_price_ao,
      totalCost: listing?.supplier_price != null ? calculateTotalCost({ supplierCost: listing.supplier_price }, destination).totalCost : null,
      ramGb: v.ram ? gbOf(v.ram) : null, storageGb: v.storage ? gbOf(v.storage) : null,
      condition: v.condition, availability: listing?.availability ?? "unknown", shippingCost: null,
    };
  });
  const ranked = rankProducts(items);

  return (
    <>
      <PageHeader title="Ranking interno" action={
        <form className="flex items-center gap-2"><label htmlFor="dest" className="text-sm">Destino</label>
          <select id="dest" name="dest" defaultValue={destination} className="rounded border border-line px-2 py-1 text-sm"><option value="PT">Portugal</option><option value="AO">Angola</option></select>
          <button className="rounded-md border border-line px-3 py-1.5 text-sm">Aplicar</button></form>
      } />
      <p className="mb-4 max-w-3xl text-sm text-ink-soft">Ranking consultivo para apoiar a decisão (preço, margem, especificações, condição, disponibilidade). Não altera dados nem compra a fornecedores. Custos de envio e encargos ainda não estão incluídos; dados em falta contam como neutros e ficam assinalados.</p>
      {ranked.length === 0 ? <Empty>Sem produtos ativos para classificar.</Empty> : (
        <Table head={["#", "Produto", "Preço", "Margem*", "Pontuação", ...Object.values(LABELS), "Em falta"]}>
          {ranked.map((r, i) => (
            <tr key={r.item.id}>
              <td className={td}>{i + 1}</td>
              <td className={td}>{r.item.name}{demo.has(r.item.id) && <DemoBadge />}</td>
              <td className={td}>{r.item.sellingPrice !== null ? formatEuro(r.item.sellingPrice) : "—"}</td>
              <td className={td}>{r.item.sellingPrice !== null && r.item.totalCost !== null ? formatEuro(r.item.sellingPrice - r.item.totalCost) : "—"}</td>
              <td className={`${td} font-semibold`}>{r.score}</td>
              {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((k) => <td key={k} className={td}>{Math.round(r.parts[k] * 100)}</td>)}
              <td className={td}>{r.missing.map((m) => LABELS[m]).join(", ") || "—"}</td>
            </tr>
          ))}
        </Table>
      )}
      <p className="mt-3 text-xs text-ink-mute">* Margem = preço de venda − custo do fornecedor (sem envio/encargos).</p>
    </>
  );
}
