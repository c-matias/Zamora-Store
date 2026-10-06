import type { Metadata } from "next";
import Link from "next/link";
import { resolveCart } from "@/server/cart";
import { getCountry } from "@/lib/country";
import { formatEuro } from "@/lib/format";
import { variantLabel } from "@/services/catalog";
import { MAX_QTY } from "@/services/cart";
import { t } from "@/lib/i18n/pt-PT";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { inputClass } from "@/components/forms/Field";
import { clearCart, removeCartLine, updateCartLine } from "./actions";

export const metadata: Metadata = { title: "Carrinho", robots: { index: false } };

export default async function CartPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const country = await getCountry();
  const { lines, subtotal, hasUnpriced } = await resolveCart(country);
  const countryName = country === "PT" ? "Portugal" : "Angola";

  return (
    <div className="mx-auto max-w-page px-4 py-10">
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Carrinho" }]} />
      <h1 className="mt-4 text-3xl font-semibold text-navy-950">Carrinho</h1>
      {error && <p role="alert" className="mt-4 rounded-md border border-red-700 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {lines.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-line p-10 text-center">
          <p className="text-ink">O carrinho está vazio.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/products" className="rounded-md bg-navy-900 px-5 py-3 font-medium text-white hover:bg-navy-800">Ver equipamentos</Link>
            <Link href="/request" className="rounded-md border border-navy-900 px-5 py-3 font-medium text-navy-900">Pedir equipamento</Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr,20rem]">
          <ul className="divide-y divide-line rounded-xl border border-line">
            {lines.map((l) => (
              <li key={l.v} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${l.product.slug}?v=${l.v}`} className="font-medium text-ink hover:underline">{l.product.name}</Link>
                  <p className="text-sm text-ink-soft">{t.conditions[l.variant.condition]} · {variantLabel(l.variant)}</p>
                  <p className="mt-1 text-sm">
                    {l.unitPrice !== null ? <>{formatEuro(l.unitPrice)} <span className="text-ink-mute">/ unidade</span></> : <span role="alert" className="text-red-800">Sem preço para {countryName}</span>}
                  </p>
                </div>
                <form action={updateCartLine} className="flex items-end gap-2">
                  <input type="hidden" name="variantId" value={l.v} />
                  <div>
                    <label htmlFor={`q-${l.v}`} className="block text-xs text-ink-mute">Quantidade</label>
                    <input id={`q-${l.v}`} name="quantity" type="number" min={1} max={MAX_QTY} defaultValue={l.q} className={`${inputClass} w-20`} />
                  </div>
                  <button className="rounded-md border border-line px-3 py-2 text-sm hover:bg-surface">Atualizar</button>
                </form>
                <form action={removeCartLine}>
                  <input type="hidden" name="variantId" value={l.v} />
                  <button className="rounded-md px-3 py-2 text-sm text-red-800 underline" aria-label={`Remover ${l.product.name}`}>Remover</button>
                </form>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-xl border border-line p-5" aria-label="Resumo">
            <h2 className="font-semibold">Resumo ({countryName})</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-ink-mute">Subtotal</dt><dd>{formatEuro(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-mute">Transporte e encargos</dt><dd>A confirmar</dd></div>
              <div className="flex justify-between"><dt className="text-ink-mute">Pagamento</dt><dd>A confirmar</dd></div>
            </dl>
            <p className="mt-3 text-xs text-ink-soft">{t.product.availabilityNotice} {country === "AO" && "Para Angola, os custos de transporte e eventuais encargos aplicáveis são confirmados antes da conclusão da encomenda."}</p>
            {hasUnpriced
              ? <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">Há equipamentos sem preço para {countryName}. Remova-os, ou altere o país de destino no topo da página.</p>
              : <Link href="/checkout" className="mt-4 block rounded-md bg-navy-900 px-5 py-3 text-center font-medium text-white hover:bg-navy-800">Continuar para a encomenda</Link>}
            <form action={clearCart} className="mt-3 text-center"><button className="text-sm text-ink-soft underline">Esvaziar carrinho</button></form>
          </aside>
        </div>
      )}
    </div>
  );
}
