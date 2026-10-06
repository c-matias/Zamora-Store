import Link from "next/link";
import { adminDb } from "@/server/admin";
import { setProductStatus, deleteProduct } from "../../_actions/products";
import { formatEuro } from "@/lib/format";
import { t } from "@/lib/i18n/pt-PT";
import { ConfirmButton } from "../../_components/ConfirmButton";
import { PageHeader, Flash, Empty, Table, td, btnPrimary, btnGhost, btnDanger, DemoBadge } from "../../_components/ui";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const sp = await searchParams;
  const db = await adminDb();
  const { data, error } = await db.from("products").select("id, name, slug, category, status, is_demo, product_variants(selling_price_pt, selling_price_ao)").order("created_at", { ascending: false });
  if (error) throw error;
  return (
    <>
      <PageHeader title="Produtos" action={<Link href="/admin/products/new" className={btnPrimary}>Novo produto</Link>} />
      <Flash error={sp.error} saved={sp.saved} />
      {(data ?? []).length === 0 ? <Empty>Ainda não há produtos. Crie o primeiro ou execute o seed de demonstração.</Empty> : (
        <Table head={["Produto", "Categoria", "Preço PT", "Preço AO", "Estado", "Ações"]}>
          {(data ?? []).map((p: any) => {
            const vs: any[] = p.product_variants ?? [];
            const low = (k: string) => { const xs = vs.map((v) => v[k]).filter((x) => x != null); return xs.length ? Math.min(...xs) : null; };
            const [pt, ao] = [low("selling_price_pt"), low("selling_price_ao")];
            return (
              <tr key={p.id}>
                <td className={td}><Link className="font-medium text-navy-700 underline" href={`/admin/products/${p.id}`}>{p.name}</Link>{p.is_demo && <DemoBadge />}</td>
                <td className={td}>{t.categories[p.category as keyof typeof t.categories]}</td>
                <td className={td}>{pt !== null ? formatEuro(pt) : "Sob consulta"}{vs.length > 1 && <span className="text-xs text-ink-mute"> ({vs.length} var.)</span>}</td>
                <td className={td}>{ao !== null ? formatEuro(ao) : "Sob consulta"}</td>
                <td className={td}>{p.status}</td>
                <td className={`${td} flex gap-2`}>
                  <form action={setProductStatus}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="status" value={p.status} /><button className={btnGhost}>{p.status === "active" ? "Desativar" : "Ativar"}</button></form>
                  <form action={deleteProduct}><input type="hidden" name="id" value={p.id} /><ConfirmButton className={btnDanger} message={`Apagar “${p.name}”? Esta ação é irreversível.`}>Apagar</ConfirmButton></form>
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
