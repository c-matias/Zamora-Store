import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";

/** Verificação autoritativa de acesso ao admin (o middleware é só a primeira barreira). */
export async function requireStaff(): Promise<{ userId: string; role: UserRole }> {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    redirect("/admin/login");
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role as UserRole | undefined;
  if (role !== "admin" && role !== "staff") redirect("/admin/login?error=forbidden");
  return { userId: user.id, role };
}
