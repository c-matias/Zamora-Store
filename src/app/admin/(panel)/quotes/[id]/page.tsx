import { notFound } from "next/navigation";
import { adminDb } from "@/server/admin";
import { saveQuote, quoteAction } from "../../../_actions/quotes";
import { centsToInput } from "@/lib/money";
import { formatEuro } from "@/lib/format";
import { Field, inputClass } from "@/components/forms/Field";
import { PageHeader, Flash, btnPrimary, btnGhost, shortId, fmtDate } from "../../../_components/ui";

export const dynamic = "force-dynamic";

export default async function QuotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const db = await adminDb();
  const { data: q } = await db.from("quotes").select("*, customers(name, email, phone, city), products(name)").eq("id", id).maybeSingle();
  if (!q) notFound();
  const editable = q.status === "draft";
  const act = (action: string, label: string, primary = false) => (
    <form action={quoteAction}><input type="hidden" name="id" value={q.id} /><input type="hidden" name="action" value={action} /><button className={primary ? btnPrimary : btnGhost}>{label}</button></form>
  );

  return (
    <>
      <PageHeader title={`Cotação #${shortId(q.id)}`} />
      <Flash error={sp.error} saved={sp.saved} />
      <p className="mb-6 text-sm text-ink-soft">{q.customers.name} · {q.customers.email} · {q.customers.phone} · {q.customers.city}<br />{q.products?.name ?? "Sem produto do catálogo"} · Destino {q.destination} · Estado <strong>{q.status}</strong> · {fmtDate(q.created_at)}{q.expires_at ? ` · Válida até ${fmtDate(q.expires_at)}` : ""}</p>

      <form action={saveQuote} className="grid max-w-3xl gap-4 sm:grid-cols-2">
        <input type="hidden" name="id" value={q.id} />
        <fieldset disabled={!editable} className="contents">
          <Field id="supplierCost" label="Custo do fornecedor (€)"><input id="supplierCost" name="supplierCost" inputMode="decimal" defaultValue={centsToInput(q.supplier_cost)} className={inputClass} /></Field>
          <Field id="shippingCost" label={`Envio para ${q.destination === "PT" ? "Portugal" : "Angola"} (€)`} hint="Inclui envio do fornecedor, se aplicável."><input id="shippingCost" name="shippingCost" inputMode="decimal" defaultValue={centsToInput(q.shipping_cost)} className={inputClass} /></Field>
          <Field id="taxesAndFees" label="Impostos e encargos (€)" hint="Só valores confirmados."><input id="taxesAndFees" name="taxesAndFees" inputMode="decimal" defaultValue={centsToInput(q.taxes_and_fees)} className={inputClass} /></Field>
          <Field id="paymentFees" label="Taxas de pagamento (€)"><input id="paymentFees" name="paymentFees" inputMode="decimal" defaultValue={centsToInput(q.payment_fees)} className={inputClass} /></Field>
          <Field id="targetMargin" label="Margem alvo (%)" hint="Usada só se o preço final estiver vazio."><input id="targetMargin" name="targetMargin" inputMode="decimal" className={inputClass} /></Field>
          <Field id="finalPrice" label="Preço final (€)"><input id="finalPrice" name="finalPrice" inputMode="decimal" defaultValue={centsToInput(q.final_price || null)} className={inputClass} /></Field>
          <div className="sm:col-span-2"><Field id="notes" label="Notas"><textarea id="notes" name="notes" rows={3} defaultValue={q.notes ?? ""} className={inputClass} /></Field></div>
          <div className="sm:col-span-2"><button className={btnPrimary}>Guardar e calcular margem</button></div>
        </fieldset>
      </form>

      <div className="mt-6 max-w-3xl rounded-xl border border-line bg-surface p-4 text-sm">
        Margem bruta: <strong>{formatEuro(q.margin)}</strong> sobre um preço final de <strong>{q.final_price ? formatEuro(q.final_price) : "—"}</strong>.
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {q.status === "draft" && act("send", "Enviar cotação", true)}
        {q.status === "sent" && <>{act("accept", "Marcar como aceite", true)}{act("reject", "Marcar como rejeitada")}</>}
        {q.status === "accepted" && act("convert", "Converter em pedido", true)}
      </div>
      <p className="mt-3 text-xs text-ink-mute">“Enviar” marca a cotação como enviada; o contacto com o cliente (email/WhatsApp) é feito manualmente nesta versão.</p>
    </>
  );
}
