"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Field, a11y, inputClass } from "@/components/forms/Field";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setPending(true);
    const f = new FormData(e.currentTarget);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) { setError("Autenticação não configurada."); setPending(false); return; }
    const { error: err } = await supabase.auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("password")) });
    setPending(false);
    if (err) { setError("Email ou palavra-passe incorretos."); return; }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      <Field id="email" label="Email"><input {...a11y("email")} type="email" required autoComplete="username" className={inputClass} /></Field>
      <Field id="password" label="Palavra-passe"><input {...a11y("password")} type="password" required autoComplete="current-password" className={inputClass} /></Field>
      <button type="submit" disabled={pending} className="rounded-md bg-navy-900 px-5 py-3 font-medium text-white hover:bg-navy-800 disabled:opacity-60">{pending ? "A entrar…" : "Entrar"}</button>
    </form>
  );
}
