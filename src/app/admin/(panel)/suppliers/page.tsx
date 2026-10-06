import { adminDb } from "@/server/admin";
import { createSupplier, toggleSupplier } from "../../_actions/misc";
import { Field, inputClass } from "@/components/forms/Field";
import { PageHeader, Flash, Empty, Table, td, btnPrimary, btnGhost } from "../../_components/ui";

export const dynamic = "force-dynamic";

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const sp = await searchParams;
  const db = await adminDb();
  const { data, error } = await db.from("suppliers").select("*").order("name");
  if (error) throw error;
  return (
    <>
      <PageHeader title="Fornecedores" />
      <Flash error={sp.error} saved={sp.saved} />
      <form action={createSupplier} className="mb-8 grid max-w-3xl gap-4 sm:grid-cols-2">
        <Field id="name" label="Nome"><input id="name" name="name" required className={inputClass} /></Field>
        <Field id="website" label="Website"><input id="website" name="website" type="url" className={inputClass} /></Field>
        <Field id="country" label="País"><input id="country" name="country" className={inputClass} /></Field>
        <Field id="notes" label="Notas"><input id="notes" name="notes" className={inputClass} /></Field>
        <div className="sm:col-span-2"><button className={btnPrimary}>Adicionar fornecedor</button></div>
      </form>
      {(data ?? []).length === 0 ? <Empty>Ainda não há fornecedores.</Empty> : (
        <Table head={["Nome", "Website", "País", "Estado", "Ações"]}>
          {(data ?? []).map((s: any) => (
            <tr key={s.id}>
              <td className={td}>{s.name}</td><td className={td}>{s.website ?? "—"}</td><td className={td}>{s.country ?? "—"}</td><td className={td}>{s.status}</td>
              <td className={td}><form action={toggleSupplier}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="status" value={s.status} /><button className={btnGhost}>{s.status === "active" ? "Desativar" : "Ativar"}</button></form></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
