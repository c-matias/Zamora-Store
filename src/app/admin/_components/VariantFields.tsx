import { Field, inputClass } from "@/components/forms/Field";
import { centsToInput } from "@/lib/money";
import { t } from "@/lib/i18n/pt-PT";

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Campos de uma variante + fornecedor. `p` (prefixo) evita IDs duplicados quando há vários formulários na página. */
export function VariantFields({ p, variant, listing, suppliers, withCondition }: { p: string; variant?: any; listing?: any; suppliers: any[]; withCondition?: boolean }) {
  const text = (name: string, label: string, value?: string | null, hint?: string) => (
    <Field id={`${p}-${name}`} label={label} hint={hint}><input id={`${p}-${name}`} name={name} defaultValue={value ?? ""} className={inputClass} /></Field>
  );
  const money = (name: string, label: string, cents?: number | null, hint?: string) => (
    <Field id={`${p}-${name}`} label={label} hint={hint}><input id={`${p}-${name}`} name={name} inputMode="decimal" defaultValue={centsToInput(cents)} className={inputClass} /></Field>
  );
  return (
    <>
      {variant && <input type="hidden" name="variantId" value={variant.id} />}
      {listing && <input type="hidden" name="listingId" value={listing.id} />}
      <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Configuração e preços de venda</legend>
        {text("cpu", "Processador", variant?.cpu)}
        {text("ram", "RAM", variant?.ram)}
        {text("storage", "Armazenamento", variant?.storage)}
        {text("os", "Sistema operativo", variant?.os, "Só preencha se confirmado (ex.: Windows 11 Pro, macOS, Android).")}
        {text("color", "Cor", variant?.color)}
        {withCondition && (
          <Field id={`${p}-variantCondition`} label="Condição desta variante">
            <select id={`${p}-variantCondition`} name="variantCondition" defaultValue={variant?.condition ?? "good"} className={inputClass}>
              {(Object.keys(t.conditions) as (keyof typeof t.conditions)[]).map((c) => <option key={c} value={c}>{t.conditions[c]}</option>)}
            </select>
          </Field>
        )}
        {money("pricePT", "Preço de venda Portugal (€)", variant?.selling_price_pt, "Vazio = preço sob consulta.")}
        {money("priceAO", "Preço de venda Angola (€)", variant?.selling_price_ao, "Vazio = preço sob consulta.")}
      </fieldset>
      <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">Fornecedor (interno, nunca visível na loja)</legend>
        <Field id={`${p}-supplierId`} label="Fornecedor">
          <select id={`${p}-supplierId`} name="supplierId" defaultValue={listing?.supplier_id ?? ""} className={inputClass}>
            <option value="">Nenhum</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field id={`${p}-availability`} label="Disponibilidade no fornecedor">
          <select id={`${p}-availability`} name="availability" defaultValue={listing?.availability ?? "unknown"} className={inputClass}>
            <option value="unknown">Desconhecida</option><option value="available">Disponível</option><option value="unavailable">Indisponível</option><option value="on_request">Sob consulta</option>
          </select>
        </Field>
        {money("supplierPrice", "Custo no fornecedor (€)", listing?.supplier_price)}
        <Field id={`${p}-supplierUrl`} label="URL no fornecedor"><input id={`${p}-supplierUrl`} name="supplierUrl" type="url" defaultValue={listing?.supplier_url ?? ""} className={inputClass} /></Field>
      </fieldset>
    </>
  );
}
