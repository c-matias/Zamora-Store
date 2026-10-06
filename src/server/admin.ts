import "server-only";
import { requireStaff } from "@/server/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MoneyError } from "@/lib/money";
import { ZodError } from "zod";

/** Autoriza (staff/admin) e devolve cliente com a sessão do utilizador: a RLS é a segunda barreira. */
export async function adminDb() {
  await requireStaff();
  return createSupabaseServerClient();
}

/** Mensagem segura para o utilizador; erros inesperados vão para o log. */
export function errorMessage(e: unknown): string {
  if (e instanceof MoneyError) return e.message;
  if (e instanceof ZodError) return e.issues[0]?.message ?? "Dados inválidos.";
  if (e instanceof Error && e.name === "UserError") return e.message;
  console.error("[admin]", e);
  return "Não foi possível concluir a operação.";
}

export class UserError extends Error {
  constructor(message: string) { super(message); this.name = "UserError"; }
}
