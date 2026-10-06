import Link from "next/link";
import { t } from "@/lib/i18n/pt-PT";
import { listProducts } from "@/server/products";
import { getCountry } from "@/lib/country";
import { ProductCard } from "@/components/ui/ProductCard";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

const trust = [
  ["Equipamentos selecionados", "Procuramos opções junto de fornecedores e marketplaces europeus."],
  ["Compra sob encomenda", "Só compramos ao fornecedor depois de confirmarmos consigo."],
  ["Controlo de qualidade", "Cada equipamento é inspecionado em Portugal antes do envio."],
  ["Entrega em Portugal e Angola", "Prazos e custos confirmados antes de concluir a encomenda."],
];

const steps = [
  ["Escolha o equipamento", "Navegue no catálogo ou diga-nos o que procura."],
  ["Confirmamos disponibilidade e preço", "Verificamos junto do fornecedor antes de avançar."],
  ["Recebemos e verificamos o equipamento", "O equipamento chega a Portugal, onde é inspecionado."],
  ["Enviamos para si", "Enviamos para Portugal ou Angola, conforme o destino."],
];

export default async function HomePage() {
  const country = await getCountry();
  const featured = (await listProducts()).slice(0, 6);
  const wa = whatsappLink(whatsappMessages.general());

  return (
    <>
      <section className="bg-surface">
        <div className="mx-auto grid max-w-page items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-navy-950 sm:text-5xl">{t.hero.title}</h1>
            <p className="mt-5 max-w-prose text-lg text-ink-soft">{t.hero.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="rounded-md bg-navy-900 px-5 py-3 font-medium text-white hover:bg-navy-800">{t.hero.ctaPrimary}</Link>
              <Link href="/request" className="rounded-md border border-navy-900 px-5 py-3 font-medium text-navy-900 hover:bg-white">{t.hero.ctaSecondary}</Link>
            </div>
          </div>
          <div aria-hidden className="flex aspect-[4/3] items-center justify-center rounded-2xl border border-line bg-white text-sm text-ink-mute">
            Imagem de equipamento (a adicionar)
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-page px-4 pt-16">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map(([title, text]) => (
            <li key={title} className="border-l-2 border-navy-700 pl-4">
              <p className="font-semibold text-ink">{title}</p>
              <p className="mt-1 text-sm text-ink-soft">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-page px-4 pt-20">
        <h2 className="text-2xl font-semibold text-navy-950">Categorias</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(t.categories) as (keyof typeof t.categories)[]).map((c) => (
            <li key={c}>
              <Link href={`/products?category=${c}`} className="block rounded-xl border border-line p-6 font-medium hover:border-navy-700">
                {t.categories[c]}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-page px-4 pt-20">
        <h2 className="text-2xl font-semibold text-navy-950">Equipamentos em destaque</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((p) => <ProductCard key={p.id} product={p} country={country} />)}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-page px-4">
        <div className="rounded-2xl bg-navy-900 p-8 text-white md:p-12">
          <h2 className="text-2xl font-semibold">Procura um equipamento específico?</h2>
          <p className="mt-3 max-w-prose text-navy-50">Envie-nos o modelo, orçamento e especificações que procura. Procuramos opções disponíveis junto dos nossos fornecedores.</p>
          <Link href="/request" className="mt-6 inline-block rounded-md bg-white px-5 py-3 font-medium text-navy-900">Pedir equipamento</Link>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-page scroll-mt-20 px-4 pt-20">
        <h2 className="text-2xl font-semibold text-navy-950">Como funciona</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, text], i) => (
            <li key={title}>
              <p className="text-sm font-medium text-navy-700">Passo {i + 1}</p>
              <p className="mt-1 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-ink-soft">{text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-sm text-ink-soft">Os equipamentos são recebidos em Portugal antes do envio ao cliente, quando aplicável.</p>
      </section>

      <section className="mx-auto max-w-page px-4 pt-20">
        <h2 className="text-2xl font-semibold text-navy-950">Portugal e Angola</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-line p-6">
            <h3 className="font-semibold">🇵🇹 Portugal</h3>
            <p className="mt-2 text-sm text-ink-soft">Equipamentos disponíveis por encomenda para clientes em Portugal.</p>
          </div>
          <div className="rounded-xl border border-line p-6">
            <h3 className="font-semibold">🇦🇴 Angola</h3>
            <p className="mt-2 text-sm text-ink-soft">Sourcing na Europa, receção e controlo em Portugal e envio para Angola.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-page px-4 pt-20 text-center">
        <h2 className="text-2xl font-semibold text-navy-950">Não encontrou o equipamento que procura?</h2>
        <Link href={wa ?? "/request"} className="mt-6 inline-block rounded-md bg-navy-900 px-5 py-3 font-medium text-white hover:bg-navy-800">Falar connosco</Link>
      </section>
    </>
  );
}
