import Link from "next/link";
import type { Country, ProductWithVariants } from "@/types/domain";
import { t } from "@/lib/i18n/pt-PT";
import { formatEuro } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { startingPrice } from "@/services/catalog";

export function ProductCard({ product, country }: { product: ProductWithVariants; country: Country }) {
  const v = product.variants[0];
  const from = startingPrice(product, country);
  const many = product.variants.length > 1;
  const specs = many ? `${product.variants.length} configurações` : [v?.cpu, v?.ram, v?.storage].filter(Boolean).join(" · ");

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-white">
      <div className="relative aspect-[4/3] bg-surface">
        {product.images[0] ? (
          <ProductImage src={product.images[0]} alt={product.name} sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-sm text-ink-mute">Fotografia por adicionar</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-ink-mute">{product.brand}</p>
          <span className="rounded-full bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-800">{t.product.onOrder}</span>
        </div>
        <h3 className="font-semibold text-ink">{product.model}</h3>
        <p className="text-sm text-ink-soft">{t.conditions[product.condition]}{specs ? ` · ${specs}` : ""}</p>
        <p className="mt-auto pt-2 text-sm text-ink-soft">
          {from ? <>{from.varies && <span className="text-ink-mute">desde </span>}<strong className="text-base text-ink">{formatEuro(from.cents)}</strong></> : t.product.priceOnRequest}
          <span className="ml-2 text-ink-mute">Destino: {country === "PT" ? "Portugal" : "Angola"}</span>
        </p>
        {product.isDemo && <p className="text-xs text-ink-mute">Demo — não é stock real</p>}
        <Link href={`/products/${product.slug}`} className="mt-2 rounded-md border border-navy-900 px-3 py-2 text-center text-sm font-medium text-navy-900 hover:bg-navy-50">
          {t.product.view}
        </Link>
      </div>
    </article>
  );
}
