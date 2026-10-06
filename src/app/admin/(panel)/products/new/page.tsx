import { adminDb } from "@/server/admin";
import { ProductForm } from "../../../_components/ProductForm";
import { PageHeader, Flash } from "../../../_components/ui";

export const dynamic = "force-dynamic";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const db = await adminDb();
  const { data: suppliers } = await db.from("suppliers").select("id, name").eq("status", "active").order("name");
  return (<><PageHeader title="Novo produto" /><Flash error={sp.error} /><ProductForm suppliers={suppliers ?? []} /></>);
}
