"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, a11y, inputClass } from "./Field";
import { customerSchema, fieldErrors } from "@/lib/validation";
import { formatEuro } from "@/lib/format";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";
import { t } from "@/lib/i18n/pt-PT";

type Country = "PT" | "AO";
export interface CheckoutItem { variantId: string; name: string; qty: number; pricePT: number | null; priceAO: number | null }
interface Props {
  items: CheckoutItem[];
  /** true = vem do carrinho (quantidades fixas aqui; edita-se no carrinho). false = "encomendar agora" de um só produto. */
  fromCart: boolean;
  initialCountry: Country;
}
const STEPS = ["Produto", "Dados do cliente", "Destino", "Resumo", "Confirmação"] as const;

export function CheckoutFlow({ items, fromCart, initialCountry }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [qtys, setQtys] = useState<Record<string, number>>(() => Object.fromEntries(items.map((i) => [i.variantId, i.qty])));
  const qtyOf = (i: CheckoutItem) => qtys[i.variantId] ?? i.qty;
  const editableQty = !fromCart && items.length === 1;
  const [d, setD] = useState({ name: "", email: "", phone: "", city: "", address: "", postalCode: "", notes: "" });
  const [country, setCountry] = useState<Country>(initialCountry);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ kind: "order" | "quote"; ref: string } | null>(null);
  const [website, setWebsite] = useState("");
  const alertRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (formError) alertRef.current?.focus(); }, [formError]);
  const headingRef = useRef<HTMLDivElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, [step]);

  const unitFor = (i: CheckoutItem) => (country === "PT" ? i.pricePT : i.priceAO);
  const unpriced = items.filter((i) => unitFor(i) === null);
  const total = unpriced.length > 0 ? null : items.reduce((sum, i) => sum + (unitFor(i) as number) * qtyOf(i), 0);
  const blocked = fromCart && unpriced.length > 0; // o carrinho só aceita itens com preço no destino
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD((p) => ({ ...p, [k]: e.target.value }));
  const customer = () => ({ ...d, country, address: d.address || undefined, postalCode: d.postalCode || undefined });

  function next() {
    setErrors({});
    if (step === 1) {
      const r = customerSchema.pick({ name: true, email: true, phone: true }).safeParse(d);
      if (!r.success) { setErrors(Object.fromEntries(Object.entries(fieldErrors(r.error)).map(([k, v]) => [`customer.${k}`, v]))); return; }
    }
    if (step === 2) {
      const r = customerSchema.safeParse(customer());
      const e = r.success ? {} : fieldErrors(r.error);
      if (country === "PT" && !d.postalCode.trim()) e["postalCode"] = "Indique o código postal";
      if (!d.address.trim()) e["address"] = "Indique a morada";
      if (Object.keys(e).length) { setErrors(Object.fromEntries(Object.entries(e).map(([k, v]) => [`customer.${k}`, v]))); return; }
    }
    setStep((s) => s + 1);
  }

  async function submit() {
    setPending(true); setFormError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((i) => ({ variantId: i.variantId, quantity: qtyOf(i) })), fromCart, destination: country, customer: customer(), notes: d.notes || undefined, website }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors(data.fields ?? {}); setFormError(data.error ?? "Não foi possível submeter a encomenda."); return; }
      setResult({ kind: data.kind, ref: data.ref });
      setStep(4);
      if (fromCart) router.refresh(); // carrinho esvaziado no servidor: atualizar o ícone
    } catch {
      setFormError("Sem ligação. Verifique a internet e tente novamente.");
    } finally { setPending(false); }
  }

  const err = (k: string) => errors[`customer.${k}`] ?? errors[k];
  const btn = "rounded-md bg-navy-900 px-5 py-3 font-medium text-white hover:bg-navy-800 disabled:opacity-60";
  const ghost = "rounded-md border border-line px-5 py-3 font-medium text-ink hover:bg-surface";

  return (
    <div ref={headingRef} tabIndex={-1} className="outline-none">
      <ol aria-label="Etapas" className="mb-8 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className={i === step ? "font-semibold text-navy-900" : "text-ink-mute"}>{i + 1}. {s}</li>
        ))}
      </ol>
      {formError && <p ref={alertRef} tabIndex={-1} role="alert" className="mb-4 rounded-md border border-red-700 bg-red-50 p-3 text-sm text-red-800">{formError}</p>}

      {step === 0 && (
        <section className="space-y-4">
          <ul className="divide-y divide-line rounded-xl border border-line">
            {items.map((i) => (
              <li key={i.variantId} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <span className="font-medium">{i.name}</span>
                {editableQty
                  ? <div className="max-w-[8rem]"><label htmlFor="qty" className="block text-xs text-ink-mute">Quantidade</label><input id="qty" type="number" min={1} max={10} value={qtyOf(i)} onChange={(e) => setQtys({ [i.variantId]: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })} className={inputClass} /></div>
                  : <span className="text-sm text-ink-soft">× {qtyOf(i)}</span>}
              </li>
            ))}
          </ul>
          {fromCart && <p className="text-sm"><Link href="/cart" className="underline">Alterar no carrinho</Link></p>}
          <p className="rounded-md bg-navy-50 p-3 text-sm text-navy-900">{t.product.availabilityNotice}</p>
          <button type="button" className={btn} onClick={next}>Continuar</button>
        </section>
      )}

      {step === 1 && (
        <section className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Nome" error={err("name")}><input {...a11y("name", err("name"))} value={d.name} onChange={set("name")} autoComplete="name" className={inputClass} /></Field>
          <Field id="email" label="Email" error={err("email")}><input {...a11y("email", err("email"))} type="email" value={d.email} onChange={set("email")} autoComplete="email" className={inputClass} /></Field>
          <Field id="phone" label="Telefone / WhatsApp" error={err("phone")}><input {...a11y("phone", err("phone"))} type="tel" value={d.phone} onChange={set("phone")} autoComplete="tel" className={inputClass} /></Field>
          <div className="flex gap-3 sm:col-span-2"><button type="button" className={ghost} onClick={() => setStep(0)}>Voltar</button><button type="button" className={btn} onClick={next}>Continuar</button></div>
        </section>
      )}

      {step === 2 && (
        <section className="grid gap-4 sm:grid-cols-2">
          <Field id="country" label="País de destino">
            <select id="country" value={country} onChange={(e) => setCountry(e.target.value as Country)} className={inputClass}>
              <option value="PT">Portugal</option><option value="AO">Angola</option>
            </select>
          </Field>
          <Field id="city" label="Cidade" error={err("city")}><input {...a11y("city", err("city"))} value={d.city} onChange={set("city")} autoComplete="address-level2" className={inputClass} /></Field>
          <div className="sm:col-span-2"><Field id="address" label="Morada" error={err("address")}><input {...a11y("address", err("address"))} value={d.address} onChange={set("address")} autoComplete="street-address" className={inputClass} /></Field></div>
          <Field id="postalCode" label={country === "PT" ? "Código postal" : "Código postal (se aplicável)"} error={err("postalCode")}><input {...a11y("postalCode", err("postalCode"))} value={d.postalCode} onChange={set("postalCode")} autoComplete="postal-code" className={inputClass} /></Field>
          <div className="sm:col-span-2"><Field id="notes" label="Observações"><textarea id="notes" rows={3} value={d.notes} onChange={set("notes")} className={inputClass} /></Field></div>
          {country === "AO" && <p className="rounded-md bg-navy-50 p-3 text-sm text-navy-900 sm:col-span-2">Para Angola, os custos de transporte e eventuais encargos aplicáveis serão confirmados consigo antes da conclusão final da encomenda.</p>}
          <div className="flex gap-3 sm:col-span-2"><button type="button" className={ghost} onClick={() => setStep(1)}>Voltar</button><button type="button" className={btn} onClick={next}>Continuar</button></div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <ul className="space-y-1 text-sm">
            {items.map((i) => (
              <li key={i.variantId} className="flex justify-between gap-4"><span>{i.name} × {qtyOf(i)}</span><span>{unitFor(i) !== null ? formatEuro((unitFor(i) as number) * qtyOf(i)) : "Sob consulta"}</span></li>
            ))}
          </ul>
          <dl className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 border-t border-line pt-3 text-sm">
            <dt className="text-ink-mute">Destino</dt><dd>{country === "PT" ? "Portugal" : "Angola"}, {d.city}</dd>
            <dt className="text-ink-mute">Total</dt><dd>{total !== null ? <strong>{formatEuro(total)}</strong> : "Sob consulta — enviaremos uma cotação"}</dd>
            <dt className="text-ink-mute">Transporte e encargos</dt><dd>A confirmar antes da conclusão</dd>
            <dt className="text-ink-mute">Pagamento</dt><dd>Pagamento a confirmar</dd>
          </dl>
          {country === "AO" && <p className="rounded-md bg-navy-50 p-3 text-sm text-navy-900">Transporte e eventuais encargos para Angola a confirmar antes da conclusão.</p>}
          {blocked && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">Alguns equipamentos não têm preço para {country === "PT" ? "Portugal" : "Angola"}. Volte atrás e escolha outro destino, ou <Link href="/cart" className="underline">remova-os do carrinho</Link>.</p>}
          <p className="text-sm text-ink-soft">Ao confirmar, não é feito qualquer pagamento nem compra ao fornecedor. Confirmamos primeiro disponibilidade e valores consigo.</p>
          <div aria-hidden className="absolute left-[-9999px]"><label htmlFor="website">Website</label><input id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></div>
          <div className="flex gap-3"><button type="button" className={ghost} onClick={() => setStep(2)}>Voltar</button><button type="button" disabled={pending || blocked} className={btn} onClick={submit}>{pending ? "A enviar…" : total !== null ? "Confirmar encomenda" : "Pedir cotação"}</button></div>
        </section>
      )}

      {step === 4 && result && (
        <section role="status" className="rounded-xl border border-line bg-surface p-6">
          <h2 className="text-xl font-semibold text-navy-950">{result.kind === "order" ? "Encomenda registada" : "Pedido de cotação registado"}</h2>
          <p className="mt-2 text-ink-soft">Referência <strong className="text-ink">#{result.ref}</strong>. Vamos confirmar disponibilidade junto do fornecedor e contactamos consigo com os próximos passos.</p>
          {(() => { const wa = whatsappLink(whatsappMessages.request(result.ref)); return wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className={`mt-4 inline-block ${btn}`}>Falar no WhatsApp</a> : null; })()}
        </section>
      )}
    </div>
  );
}
