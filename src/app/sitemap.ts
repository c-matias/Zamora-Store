import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";
import { listProducts } from "@/server/products";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = (await listProducts()).filter((p) => !p.isDemo);
  return [
    { url: siteConfig.url },
    { url: `${siteConfig.url}/products` },
    { url: `${siteConfig.url}/request` },
    ...products.map((p) => ({ url: `${siteConfig.url}/products/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
