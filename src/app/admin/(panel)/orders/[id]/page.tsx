import { notFound } from "next/navigation";
import { adminDb } from "@/server/admin";
import { updateOrder } from "../../../_actions/orders";
import { createPaymentLink } from "../../../_actions/payments";
import { formatEuro } from "@/lib/format";
import { nextStatuses, ORDER_STATUS_LABEL } from "@/services/order-status";
import type { OrderStatus } from "@/types/domain";
import { Field, inputClass } from "@/components/forms/Field";
import { PageHeader, Flash, btnPrimary, btnGhost, shortId, fmtDate } from "../../../_components/ui";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const db = await adminDb();
  const { data: o } = await db.from("orders")
    .select("*, customers(*), order_items(quantity, unit_price, product_variants(cpu, ram, storage, products(name)))").eq("id", id).maybeSingle();
  if (!o) notFound();
  const options: OrderStatus[] = [o.status, ...nextStatuses(o.status)];

  return (
    <>
      <PageHeader title={`Pedido #${shortId(o.id)}`} />
      <Flash error={sp.error} saved={sp.saved} />
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-6">
          <div>
            <h2 className="font-semibold">Cliente</h2>
            <p className="mt-1 text-sm text-ink-soft">{o.customers.name} · {o.customers.email} · {o.customers.phone}<br />{o.customers.city}, {o.destination}{o.customers.address ? ` · ${o.customers.address}` : ""}{o.customers.postal_code ? ` ${o.customers.postal_code}` : ""}</p>
          </div>
          <div>
            <h2 className="font-semibold">Itens</h2>
            <ul className="mt-1 text-sm text-ink-soft">
              {o.order_items.map((i: any, n: number) => <li key={n}>{i.quantity} × {i.product_variants?.products?.name}{[i.product_variants?.cpu, i.product_variants?.ram, i.product_variants?.storage].filter(Boolean).length ? ` (${[i.product_variants?.cpu, i.product_variants?.ram, i.product_variants?.storage].filter(Boolean).join(" · ")})` : ""} — {formatEuro(i.unit_price)}</li>)}
            </ul>
          </div>
          <dl className="grid grid-cols-2 gap-1 text-sm">
            <dt className="text-ink-mute">Subtotal</dt><dd>{formatEuro(o.subtotal)}</dd>
            <dt className="text-ink-mute">Envio</dt><dd>{formatEuro(o.shipping)}</dd>
            <dt className="text-ink-mute">Impostos e encargos</dt><dd>{formatEuro(o.taxes_and_fees)}</dd>
            <dt className="font-medium">Total</dt><dd className="font-medium">{formatEuro(o.total)}</dd>
            <dt className="text-ink-mute">Margem</dt><dd>{formatEuro(o.margin)}</dd>
            <dt className="text-ink-mute">Criado</dt><dd>{fmtDate(o.created_at)}</dd>
          </dl>
        </section>

        <form action={updateOrder} className="space-y-4">
          <input type="hidden" name="id" value={o.id} />
          <Field id="status" label="Estado">
            <select id="status" name="status" defaultValue={o.status} className={inputClass}>
              {options.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
          {o.status === "confirmed" && <p className="text-xs text-ink-mute">Passar a “Supplier Order” confirma que a compra ao fornecedor foi aprovada por uma pessoa.</p>}
          <Field id="paymentStatus" label="Pagamento">
            <select id="paymentStatus" name="paymentStatus" defaultValue={o.payment_status} className={inputClass}>
              <option value="to_confirm">A confirmar</option><option value="paid">Pago</option><option value="refunded">Reembolsado</option><option value="failed">Falhado</option>
            </select>
          </Field>
          <Field id="shippingStatus" label="Envio">
            <select id="shippingStatus" name="shippingStatus" defaultValue={o.shipping_status} className={inputClass}>
              <option value="not_shipped">Não enviado</option><option value="preparing">Em preparação</option><option value="shipped">Enviado</option><option value="delivered">Entregue</option>
            </select>
          </Field>
          <Field id="notes" label="Notas internas"><textarea id="notes" name="notes" rows={4} defaultValue={o.notes ?? ""} className={inputClass} /></Field>
          <button className={btnPrimary}>Guardar alterações</button>
        </form>
        {o.status === "confirmed" && o.payment_status !== "paid" && (
          <section className="lg:col-span-2 rounded-xl border border-line p-4">
            <h2 className="font-semibold">Pagamento</h2>
            {o.payment_url
              ? <p className="mt-2 break-all text-sm text-ink-soft">Link ({o.payment_provider}): <a className="underline" href={o.payment_url} target="_blank" rel="noopener noreferrer">{o.payment_url}</a></p>
              : <p className="mt-2 text-sm text-ink-soft">Gere um link depois de confirmar com o cliente o valor final (envio e encargos incluídos).</p>}
            <form action={createPaymentLink} className="mt-3"><input type="hidden" name="id" value={o.id} /><button className={btnGhost}>{o.payment_url ? "Gerar novo link" : "Gerar link de pagamento"}</button></form>
          </section>
        )}
      </div>
    </>
  );
}
