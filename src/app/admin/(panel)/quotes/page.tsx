import Link from "next/link";
import { adminDb } from "@/server/admin";
import { formatEuro } from "@/lib/format";
import { PageHeader, Empty, Table, td, shortId, fmtDate, btnPrimary } from "../../_components/ui";

export const dynamic = "force-dynamic";

export default async function QuotesPage() {
  const db = await adminDb();
  const { data, error } = await db.from("quotes").select("id, status, destination, final_price, margin, created_at, customers(name), products(name)").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (
    <>
      <PageHeader title="Cotações" action={<Link href="/admin/quotes/new" className={btnPrimary}>Nova cotação</Link>} />
      {(data ?? []).length === 0 ? <Empty>Ainda não há cotações.</Empty> : (
        <Table head={["ID", "Cliente", "Produto", "País", "Preço final", "Margem", "Estado", "Data"]}>
          {(data ?? []).map((q: any) => (
            <tr key={q.id}>
              <td className={td}><Link className="font-medium text-navy-700 underline" href={`/admin/quotes/${q.id}`}>#{shortId(q.id)}</Link></td>
              <td className={td}>{q.customers?.name}</td><td className={td}>{q.products?.name ?? "—"}</td><td className={td}>{q.destination}</td>
              <td className={td}>{q.final_price ? formatEuro(q.final_price) : "—"}</td><td className={td}>{q.final_price ? formatEuro(q.margin) : "—"}</td>
              <td className={td}>{q.status}</td><td className={td}>{fmtDate(q.created_at)}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
