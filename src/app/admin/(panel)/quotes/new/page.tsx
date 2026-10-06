import { adminDb } from "@/server/admin";
import { createQuote } from "../../../_actions/quotes";
import { Field, inputClass } from "@/components/forms/Field";
import { PageHeader, Flash, btnPrimary } from "../../../_components/ui";

export const dynamic = "force-dynamic";

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ error?: string; customer?: string }> }) {
  const sp = await searchParams;
  const db = await adminDb();
  const [{ data: customers }, { data: products }] = await Promise.all([
    db.from("customers").select("id, name, email, country").order("created_at", { ascending: false }).limit(200),
    db.from("products").select("id, name").order("name"),
  ]);
  return (
    <>
      <PageHeader title="Nova cotação" />
      <Flash error={sp.error} />
      <form action={createQuote} className="max-w-xl space-y-4">
        <Field id="customerId" label="Cliente">
          <select id="customerId" name="customerId" required defaultValue={sp.customer ?? ""} className={inputClass}>
            <option value="" disabled>Selecione…</option>
            {(customers ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.email}</option>)}
          </select>
        </Field>
        <Field id="productId" label="Produto (opcional)">
          <select id="productId" name="productId" className={inputClass}><option value="">Sem produto do catálogo</option>{(products ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        </Field>
        <Field id="destination" label="Destino"><select id="destination" name="destination" className={inputClass}><option value="PT">Portugal</option><option value="AO">Angola</option></select></Field>
        <button className={btnPrimary}>Criar cotação</button>
      </form>
    </>
  );
}
