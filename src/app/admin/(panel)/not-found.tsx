import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold text-navy-950">Não encontrado</h1>
      <p className="mt-3 text-ink-soft">O registo não existe ou foi removido.</p>
      <Link href="/admin" className="mt-6 inline-block underline">Voltar ao dashboard</Link>
    </div>
  );
}
