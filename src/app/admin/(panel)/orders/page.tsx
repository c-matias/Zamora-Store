import Link from "next/link";
import { adminDb } from "@/server/admin";
import { formatEuro } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/services/order-status";
import { PageHeader, Empty, Table, td, shortId, fmtDate, DemoBadge } from "../../_components/ui";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const db = await adminDb();
  const { data, error } = await db.from("orders")
    .select("id, status, shipping_status, destination, total, margin, created_at, customers(name), order_items(quantity, product_variants(products(name, is_demo)))")
    .order("created_at", { ascending: false }).limit(200);
  if (error) throw error;

  return (
    <>
      <PageHeader title="Pedidos" />
      {(data ?? []).length === 0 ? <Empty>Ainda não há pedidos.</Empty> : (
        <Table head={["ID", "Cliente", "Produto", "País", "Valor", "Margem", "Estado", "Envio", "Data"]}>
          {(data ?? []).map((o: any) => {
            const prod = o.order_items?.[0]?.product_variants?.products;
            return (
              <tr key={o.id}>
                <td className={td}><Link className="font-medium text-navy-700 underline" href={`/admin/orders/${o.id}`}>#{shortId(o.id)}</Link></td>
                <td className={td}>{o.customers?.name}</td>
                <td className={td}>{prod?.name ?? "—"}{(o.order_items?.length ?? 0) > 1 && <span className="text-ink-mute"> (+{o.order_items.length - 1})</span>}{prod?.is_demo && <DemoBadge />}</td>
                <td className={td}>{o.destination}</td>
                <td className={td}>{formatEuro(o.total)}</td>
                <td className={td}>{formatEuro(o.margin)}</td>
                <td className={td}>{ORDER_STATUS_LABEL[o.status as keyof typeof ORDER_STATUS_LABEL]}</td>
                <td className={td}>{o.shipping_status}</td>
                <td className={td}>{fmtDate(o.created_at)}</td>
              </tr>
            );
          })}
        </Table>
      )}
    </>
  );
}
