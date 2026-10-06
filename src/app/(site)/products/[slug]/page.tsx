import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/server/products";
import { getCountry } from "@/lib/country";
import { t } from "@/lib/i18n/pt-PT";
import { formatEuro } from "@/lib/format";
import { siteConfig } from "@/lib/config";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { JsonLd } from "@/components/ui/JsonLd";
import { ProductImage } from "@/components/ui/ProductImage";
import { addToCart } from "../../cart/actions";
import { MAX_QTY } from "@/services/cart";
import { priceFor, startingPrice, variantLabel } from "@/services/catalog";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ v?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return {};
  const description = `${p.name} recondicionado (${t.conditions[p.condition]}), disponível por encomenda para Portugal e Angola.`;
  return {
    title: p.name,
    description,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: p.name, description, type: "website", url: `/products/${p.slug}`, images: p.images[0] ? [{ url: p.images[0] }] : undefined },
    robots: p.isDemo ? { index: false } : undefined,
  };
}

const sections = [
  ["O que está incluído", "O conteúdo da embalagem (por exemplo, carregador e acessórios) é confirmado para cada equipamento antes da encomenda."],
  ["Entrega", "O equipamento é recebido em Portugal e verificado antes do envio. Custos e prazos de envio são confirmados antes de concluir a encomenda."],
  ["Garantia e devolução", "As condições aplicáveis a este equipamento são indicadas na cotação. Consulte também a política de devoluções."],
] as const;

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { v: variantParam } = await searchParams;
  const p = await getProductBySlug(slug);
  if (!p) notFound();
  const country = await getCountry();
  const many = p.variants.length > 1;
  const v = p.variants.find((x) => x.id === variantParam) ?? p.variants[0];
  const price = v ? priceFor(v, country) : null;
  const from = startingPrice(p, country);
  const waName = many && v ? `${p.name} (${variantLabel(v)})` : p.name;
  const wa = whatsappLink(whatsappMessages.product(waName));
  const checkoutHref = `/checkout?product=${p.slug}${v ? `&variant=${v.id}` : ""}`;
  const crumbs = [{ label: "Início", href: "/" }, { label: t.categories[p.category], href: `/products?category=${p.category}` }, { label: p.name }];
  const specs: [string, string | null | undefined][] = [
    ["Condição", t.conditions[p.condition]], ["Processador", v?.cpu], ["RAM", v?.ram], ["Armazenamento", v?.storage], ["Sistema operativo", v?.os], ["Cor", v?.color],
  ];

  const offers: Record<string, unknown>[] = [];
  for (const variant of p.variants) {
    for (const [country_, cents] of [["PT", variant.sellingPricePT], ["AO", variant.sellingPriceAO]] as [string, number | null][]) {
      if (cents === null) continue;
      offers.push({
        "@type": "Offer", priceCurrency: "EUR", price: (cents / 100).toFixed(2), ...(many ? { name: variantLabel(variant) } : {}),
        availability: "https://schema.org/BackOrder", itemCondition: "https://schema.org/RefurbishedCondition",
        eligibleRegion: { "@type": "Country", name: country_ }, url: `${siteConfig.url}/products/${p.slug}`,
      });
    }
  }

  return (
    <article className="mx-auto max-w-page px-4 py-10">
      {!p.isDemo && (
        <JsonLd data={{
          "@context": "https://schema.org", "@type": "Product", name: p.name, brand: { "@type": "Brand", name: p.brand }, model: p.model,
          description: p.description || undefined, image: p.images.length ? p.images : undefined, itemCondition: "https://schema.org/RefurbishedCondition",
          ...(offers.length ? { offers } : {}),
        }} />
      )}
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, ...(c.href ? { item: `${siteConfig.url}${c.href}` } : {}) })),
      }} />
      <Breadcrumbs items={crumbs} />

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-xl bg-surface">
            {p.images[0]
              ? <ProductImage src={p.images[0]} alt={p.name} sizes="(min-width: 768px) 560px, 100vw" priority />
              : <span className="absolute inset-0 flex items-center justify-center text-sm text-ink-mute">Fotografias por adicionar</span>}
          </div>
          {p.images.length > 1 && (
            <ul className="mt-3 grid grid-cols-4 gap-3">
              {p.images.slice(1, 9).map((src, i) => (
                <li key={src} className="relative aspect-square overflow-hidden rounded-lg bg-surface"><ProductImage src={src} alt={`${p.name} — imagem ${i + 2}`} sizes="140px" /></li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-sm text-ink-mute">{p.brand}</p>
          <h1 className="text-3xl font-semibold text-navy-950">{p.model}</h1>
          <p className="mt-4 text-xl">
            {price !== null ? <strong>{formatEuro(price)}</strong> : t.product.priceOnRequest}
            <span className="ml-2 text-sm text-ink-mute">({country === "PT" ? "Portugal" : "Angola"})</span>
          </p>
          {many && (
            <nav aria-label="Configurações disponíveis" className="mt-4">
              <p className="mb-2 text-sm font-medium">Configuração{from?.varies ? " (os preços variam)" : ""}</p>
              <ul className="flex flex-wrap gap-2">
                {p.variants.map((x) => {
                  const active = x.id === v?.id;
                  const px = priceFor(x, country);
                  return (
                    <li key={x.id}>
                      <Link href={`/products/${p.slug}?v=${x.id}`} scroll={false} aria-current={active ? "true" : undefined}
                        className={`block rounded-md border px-3 py-2 text-sm ${active ? "border-navy-900 bg-navy-50 text-navy-900" : "border-line hover:bg-surface"}`}>
                        {variantLabel(x)}{px !== null && <span className="ml-2 text-ink-mute">{formatEuro(px)}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}
          <p className="mt-2 text-sm"><span className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-800">{t.product.onOrder}</span></p>
          <p className="mt-4 rounded-md bg-navy-50 p-3 text-sm text-navy-900">{t.product.availabilityNotice}</p>

          <dl className="mt-6 grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 text-sm">
            {specs.filter(([, val]) => val).map(([k, val]) => (<div key={k} className="contents"><dt className="text-ink-mute">{k}</dt><dd>{val}</dd></div>))}
          </dl>

          <div className="mt-8 space-y-4">
            {price !== null && v && (
              <form action={addToCart} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="variantId" value={v.id} />
                <div>
                  <label htmlFor="quantity" className="block text-xs text-ink-mute">Quantidade</label>
                  <input id="quantity" name="quantity" type="number" min={1} max={MAX_QTY} defaultValue={1} className="w-20 rounded-md border border-line px-3 py-3 text-base" />
                </div>
                <button className="rounded-md bg-navy-900 px-5 py-3 font-medium text-white hover:bg-navy-800">Adicionar ao carrinho</button>
              </form>
            )}
            <div className="flex flex-wrap gap-3">
              {price !== null
                ? <Link href={checkoutHref} className="rounded-md border border-navy-900 px-5 py-3 font-medium text-navy-900 hover:bg-navy-50">Encomendar agora</Link>
                : <Link href={checkoutHref} className="rounded-md bg-navy-900 px-5 py-3 font-medium text-white hover:bg-navy-800">Pedir cotação</Link>}
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="rounded-md border border-line px-5 py-3 font-medium text-ink hover:bg-surface">WhatsApp</a>}
            </div>
          </div>
          {p.isDemo && <p className="mt-4 text-xs text-ink-mute">Demo — dados de demonstração, não é stock real.</p>}
        </div>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        {p.description && <section><h2 className="text-lg font-semibold text-navy-950">Descrição</h2><p className="mt-2 whitespace-pre-line text-ink-soft">{p.description}</p></section>}
        {sections.map(([title, text]) => (
          <section key={title}><h2 className="text-lg font-semibold text-navy-950">{title}</h2><p className="mt-2 text-ink-soft">{text}</p></section>
        ))}
      </div>
    </article>
  );
}
