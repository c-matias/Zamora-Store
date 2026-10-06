import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Administração", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-24">
      <h1 className="text-2xl font-semibold text-navy-950">Acesso à administração</h1>
      {error === "forbidden" && <p role="alert" className="mt-4 text-sm text-red-800">Esta conta não tem permissões de administração.</p>}
      <LoginForm />
    </main>
  );
}
