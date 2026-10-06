import Link from "next/link";
import { adminDb } from "@/server/admin";
import { updateRequestStatus } from "../../_actions/misc";
import { formatEuro } from "@/lib/format";
import { PageHeader, Flash, Empty, Table, td, shortId, fmtDate, btnGhost } from "../../_components/ui";

export const dynamic = "force-dynamic";

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const sp = await searchParams;
  const db = await adminDb();
  const { data, error } = await db.from("custom_requests").select("*, customers(id, name, email, phone)").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (
    <>
      <PageHeader title="Pedidos de sourcing" />
      <Flash error={sp.error} saved={sp.saved} />
      {(data ?? []).length === 0 ? <Empty>Ainda não há pedidos de equipamento.</Empty> : (
        <Table head={["ID", "Cliente", "Pedido", "Orçamento", "País", "Estado", "Data", "Ações"]}>
          {(data ?? []).map((r: any) => {
            const s = r.specifications ?? {};
            const what = [r.category, r.requested_brand, r.requested_model, s.cpu, s.ram, s.storage].filter(Boolean).join(" · ");
            return (
              <tr key={r.id} className="align-top">
                <td className={td}>#{shortId(r.id)}</td>
                <td className={td}>{r.customers?.name}<br /><span className="text-xs text-ink-mute">{r.customers?.email} · {r.customers?.phone}</span></td>
                <td className={td}>{what}{r.notes && <p className="mt-1 max-w-xs text-xs text-ink-soft">{r.notes}</p>}</td>
                <td className={td}>{r.budget ? formatEuro(r.budget) : "—"}</td>
                <td className={td}>{r.destination}</td>
                <td className={td}>
                  <form action={updateRequestStatus} className="flex gap-1">
                    <input type="hidden" name="id" value={r.id} />
                    <label className="sr-only" htmlFor={`st-${r.id}`}>Estado</label>
                    <select id={`st-${r.id}`} name="status" defaultValue={r.status} className="rounded border border-line px-1 py-1 text-sm">
                      <option value="new">Novo</option><option value="in_review">Em análise</option><option value="quoted">Cotado</option><option value="closed">Fechado</option>
                    </select>
                    <button className={btnGhost}>OK</button>
                  </form>
                </td>
                <td className={td}>{fmtDate(r.created_at)}</td>
                <td className={td}><Link className="underline" href={`/admin/quotes/new?customer=${r.customers?.id}`}>Criar cotação</Link></td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
