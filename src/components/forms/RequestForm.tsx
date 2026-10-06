"use client";

import { useEffect, useRef, useState } from "react";
import { Field, a11y, inputClass } from "./Field";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";
import { t } from "@/lib/i18n/pt-PT";

type Errors = Record<string, string>;

export function RequestForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [ref, setRef] = useState<string | null>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (formError) alertRef.current?.focus(); }, [formError]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setFormError(null); setErrors({});
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const opt = (k: string) => get(k) || undefined;

    const payload = {
      category: get("category"),
      brand: opt("brand"), model: opt("model"),
      budgetMax: opt("budgetMax"),
      ram: opt("ram"), storage: opt("storage"), cpu: opt("cpu"),
      condition: get("condition") || "any",
      quantity: get("quantity") || "1",
      notes: opt("notes"),
      website: get("website"),
      customer: {
        name: get("name"), email: get("email"), phone: get("phone"),
        country: get("country"), city: get("city"),
      },
    };

    try {
      const res = await fetch("/api/custom-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.fields ?? {});
        setFormError(data.error ?? "Não foi possível submeter o pedido.");
        return;
      }
      setRef(data.ref);
    } catch {
      setFormError("Sem ligação. Verifique a internet e tente novamente.");
    } finally {
      setPending(false);
    }
  }

  if (ref) {
    const wa = whatsappLink(whatsappMessages.request(ref));
    return (
      <div role="status" className="rounded-xl border border-line bg-surface p-6">
        <h2 className="text-xl font-semibold text-navy-950">Pedido recebido</h2>
        <p className="mt-2 text-ink-soft">O seu número de pedido é <strong className="text-ink">#{ref}</strong>. Vamos procurar opções junto dos fornecedores e contactamos com uma cotação. Esta cotação não implica compra até confirmar consigo.</p>
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block rounded-md bg-navy-900 px-5 py-3 font-medium text-white hover:bg-navy-800">Falar no WhatsApp</a>}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-8">
      {formError && <p ref={alertRef} tabIndex={-1} role="alert" className="rounded-md border border-red-700 bg-red-50 p-3 text-sm text-red-800">{formError}</p>}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-lg font-semibold text-navy-950">Equipamento</legend>
        <Field id="category" label="Categoria" error={errors["category"]}>
          <select {...a11y("category", errors["category"])} required defaultValue="laptops" className={inputClass}>
            {(Object.keys(t.categories) as (keyof typeof t.categories)[]).map((c) => <option key={c} value={c}>{t.categories[c]}</option>)}
          </select>
        </Field>
        <Field id="brand" label="Marca (opcional)" error={errors["brand"]}><input {...a11y("brand", errors["brand"])} className={inputClass} /></Field>
        <Field id="model" label="Modelo (opcional)" error={errors["model"]}><input {...a11y("model", errors["model"])} className={inputClass} /></Field>
        <Field id="budgetMax" label="Orçamento máximo (€)" error={errors["budgetMax"]}><input {...a11y("budgetMax", errors["budgetMax"])} inputMode="numeric" className={inputClass} /></Field>
        <Field id="ram" label="RAM" error={errors["ram"]}><input {...a11y("ram", errors["ram"])} placeholder="16 GB" className={inputClass} /></Field>
        <Field id="storage" label="Armazenamento" error={errors["storage"]}><input {...a11y("storage", errors["storage"])} placeholder="512 GB SSD" className={inputClass} /></Field>
        <Field id="cpu" label="Processador" error={errors["cpu"]}><input {...a11y("cpu", errors["cpu"])} className={inputClass} /></Field>
        <Field id="condition" label="Condição pretendida" error={errors["condition"]}>
          <select {...a11y("condition", errors["condition"])} defaultValue="any" className={inputClass}>
            <option value="any">Indiferente</option>
            {(Object.keys(t.conditions) as (keyof typeof t.conditions)[]).map((c) => <option key={c} value={c}>{t.conditions[c]}</option>)}
          </select>
        </Field>
        <Field id="quantity" label="Quantidade" error={errors["quantity"]}><input {...a11y("quantity", errors["quantity"])} type="number" min={1} max={100} defaultValue={1} className={inputClass} /></Field>
        <div className="sm:col-span-2">
          <Field id="notes" label="Observações" error={errors["notes"]} hint="Ex.: Procuro um portátil para programação, 16 GB RAM, 512 GB SSD, até €600.">
            <textarea {...a11y("notes", errors["notes"])} rows={4} className={inputClass} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-lg font-semibold text-navy-950">Os seus dados</legend>
        <Field id="name" label="Nome" error={errors["customer.name"]}><input {...a11y("name", errors["customer.name"])} required autoComplete="name" className={inputClass} /></Field>
        <Field id="email" label="Email" error={errors["customer.email"]}><input {...a11y("email", errors["customer.email"])} type="email" required autoComplete="email" className={inputClass} /></Field>
        <Field id="phone" label="Telefone / WhatsApp" error={errors["customer.phone"]}><input {...a11y("phone", errors["customer.phone"])} type="tel" required autoComplete="tel" className={inputClass} /></Field>
        <Field id="country" label="País de destino" error={errors["customer.country"]}>
          <select {...a11y("country", errors["customer.country"])} defaultValue="PT" className={inputClass}>
            <option value="PT">Portugal</option>
            <option value="AO">Angola</option>
          </select>
        </Field>
        <Field id="city" label="Cidade" error={errors["customer.city"]}><input {...a11y("city", errors["customer.city"])} required autoComplete="address-level2" className={inputClass} /></Field>
      </fieldset>

      {/* Honeypot: invisível para pessoas; bots preenchem-no */}
      <div aria-hidden className="absolute left-[-9999px]">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button type="submit" disabled={pending} className="rounded-md bg-navy-900 px-6 py-3 font-medium text-white hover:bg-navy-800 disabled:opacity-60">
        {pending ? "A enviar…" : "Enviar pedido"}
      </button>
    </form>
  );
}
