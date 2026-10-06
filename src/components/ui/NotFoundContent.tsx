import Link from "next/link";

export function NotFoundContent() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-navy-950">Página não encontrada</h1>
      <p className="mt-3 text-ink-soft">O endereço não existe ou o equipamento já não está no catálogo.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="rounded-md bg-navy-900 px-5 py-3 font-medium text-white hover:bg-navy-800">Ir para o início</Link>
        <Link href="/products" className="rounded-md border border-navy-900 px-5 py-3 font-medium text-navy-900">Ver equipamentos</Link>
      </div>
    </div>
  );
}
