import { adminDb } from "@/server/admin";
import { PageHeader, Empty, Table, td, fmtDate } from "../../_components/ui";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const db = await adminDb();
  const { data, error } = await db.from("customers").select("id, name, email, phone, country, city, created_at").order("created_at", { ascending: false }).limit(300);
  if (error) throw error;
  return (
    <>
      <PageHeader title="Clientes" />
      {(data ?? []).length === 0 ? <Empty>Ainda não há clientes.</Empty> : (
        <Table head={["Nome", "Email", "Telefone", "País", "Cidade", "Registo"]}>
          {(data ?? []).map((c: any) => (
            <tr key={c.id}><td className={td}>{c.name}</td><td className={td}>{c.email}</td><td className={td}>{c.phone}</td><td className={td}>{c.country}</td><td className={td}>{c.city}</td><td className={td}>{fmtDate(c.created_at)}</td></tr>
          ))}
        </Table>
      )}
    </>
  );
}
