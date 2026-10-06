import Link from "next/link";
import { adminDb } from "@/server/admin";
import { ORDER_STATUS_LABEL } from "@/services/order-status";
import { PageHeader, Empty, Table, td, shortId, fmtDate } from "../../_components/ui";

export const dynamic = "force-dynamic";

const SHIPPING_LABEL: Record<string, string> = { not_shipped: "Não enviado", preparing: "Em preparação", shipped: "Enviado", delivered: "Entregue" };
// Encomendas em que o envio já é relevante (recebidas em Portugal ou mais adiante), excluindo concluídas/canceladas.
const RELEVANT = ["received", "quality_check", "ready_to_ship", "shipped"];

export default async function ShippingPage() {
  const db = await adminDb();
  const { data, error } = await db.from("orders")
    .select("id, status, shipping_status, destination, shipping, created_at, customers(name, city, address, postal_code)")
    .in("status", RELEVANT).order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as any[];

  return (
    <>
      <PageHeader title="Envios" />
      <p className="mb-4 max-w-3xl text-sm text-ink-soft">Encomendas já recebidas em Portugal e ainda por entregar. O estado de envio altera-se no detalhe do pedido.</p>
      {rows.length === 0 ? <Empty>Sem encomendas a aguardar envio.</Empty> : (
        <Table head={["ID", "Cliente", "Destino", "Morada", "Estado do pedido", "Envio", "Desde"]}>
          {rows.map((o) => (
            <tr key={o.id}>
              <td className={td}><Link className="font-medium text-navy-700 underline" href={`/admin/orders/${o.id}`}>#{shortId(o.id)}</Link></td>
              <td className={td}>{o.customers?.name}</td>
              <td className={td}>{o.destination === "PT" ? "Portugal" : "Angola"}</td>
              <td className={td}>{[o.customers?.address, o.customers?.postal_code, o.customers?.city].filter(Boolean).join(", ") || "—"}</td>
              <td className={td}>{ORDER_STATUS_LABEL[o.status as keyof typeof ORDER_STATUS_LABEL]}</td>
              <td className={td}>{SHIPPING_LABEL[o.shipping_status] ?? o.shipping_status}</td>
              <td className={td}>{fmtDate(o.created_at)}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
