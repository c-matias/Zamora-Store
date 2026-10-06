"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-navy-950">Algo correu mal</h1>
      <p className="mt-3 text-ink-soft">Não foi possível carregar esta página. Tente novamente; se o problema continuar, contacte-nos.</p>
      <button onClick={reset} className="mt-6 rounded-md bg-navy-900 px-5 py-3 font-medium text-white hover:bg-navy-800">Tentar novamente</button>
    </div>
  );
}
