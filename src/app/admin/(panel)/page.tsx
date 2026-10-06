import Link from "next/link";
import { adminDb } from "@/server/admin";
import { summarize } from "@/services/dashboard";
import { formatEuro } from "@/lib/format";
import { PageHeader, Empty } from "../_components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const db = await adminDb();
  const [{ data: orders }, { data: quotes }] = await Promise.all([
    db.from("orders").select("status, payment_status, total, margin"),
    db.from("quotes").select("status"),
  ]);
  const s = summarize(orders ?? [], quotes ?? []);
  const cards: [string, string][] = [
    ["Pedidos pendentes", String(s.pendingOrders)],
    ["Pedidos em processamento", String(s.processingOrders)],
    ["Pedidos concluídos", String(s.completedOrders)],
    ["Cotações pendentes", String(s.pendingQuotes)],
    ["Receita (pagamentos confirmados)", formatEuro(s.revenue)],
    ["Margem estimada", formatEuro(s.estimatedMargin)],
  ];
  const empty = (orders?.length ?? 0) === 0 && (quotes?.length ?? 0) === 0;

  return (
    <>
      <PageHeader title="Dashboard" />
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line p-5">
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-navy-950">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-ink-mute">A margem estimada usa o custo do fornecedor registado; envio e encargos a confirmar não estão incluídos até serem definidos numa cotação.</p>
      {empty && <div className="mt-8"><Empty>Ainda não há pedidos nem cotações. Os pedidos dos clientes aparecem aqui. <Link className="underline" href="/admin/products">Gerir produtos</Link></Empty></div>}
    </>
  );
}
