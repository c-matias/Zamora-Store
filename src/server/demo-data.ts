import type { ProductWithVariants, Category, Condition } from "@/types/domain";

/**
 * DADOS DE DEMONSTRAÇÃO — não são stock real. Sem preços nem fornecedores inventados:
 * os preços ficam a null ("Preço sob consulta") até serem configurados no admin.
 * Especificações são exemplos de configuração típica e devem ser confirmadas por produto real.
 */
const now = "2026-01-01T00:00:00.000Z";

function demo(
  slug: string, name: string, brand: string, model: string, category: Category,
  condition: Condition, spec: { cpu?: string; ram?: string; storage?: string; os?: string },
): ProductWithVariants {
  return {
    id: `demo-${slug}`, name, slug, brand, model, category,
    description: `Exemplo de ${name} em condição recondicionada. Dados de demonstração.`,
    condition, status: "active", images: [], isDemo: true, createdAt: now, updatedAt: now,
    variants: [{
      id: `demo-${slug}-v1`, productId: `demo-${slug}`,
      cpu: spec.cpu ?? null, ram: spec.ram ?? null, storage: spec.storage ?? null, color: null, os: spec.os ?? null,
      condition, sellingPricePT: null, sellingPriceAO: null,
    }],
  };
}

export const demoProducts: ProductWithVariants[] = [
  demo("dell-latitude-5420", "Dell Latitude 5420", "Dell", "Latitude 5420", "laptops", "very_good", { ram: "16 GB", storage: "512 GB SSD" }),
  demo("lenovo-thinkpad-t14-gen-2", "Lenovo ThinkPad T14 Gen 2", "Lenovo", "ThinkPad T14 Gen 2", "laptops", "very_good", { ram: "16 GB", storage: "512 GB SSD" }),
  demo("hp-elitebook-840-g8", "HP EliteBook 840 G8", "HP", "EliteBook 840 G8", "laptops", "good", { ram: "16 GB", storage: "256 GB SSD" }),
  demo("macbook-air-m1", "MacBook Air M1", "Apple", "MacBook Air M1", "laptops", "excellent", { cpu: "Apple M1", ram: "8 GB", storage: "256 GB SSD", os: "macOS" }),
  demo("iphone-13", "iPhone 13", "Apple", "iPhone 13", "smartphones", "very_good", { storage: "128 GB", os: "iOS" }),
  demo("samsung-galaxy-s22", "Samsung Galaxy S22", "Samsung", "Galaxy S22", "smartphones", "good", { storage: "128 GB", os: "Android" }),
  demo("apple-ipad", "iPad", "Apple", "iPad", "tablets", "good", { storage: "64 GB", os: "iPadOS" }),
  demo("samsung-galaxy-tab", "Samsung Galaxy Tab", "Samsung", "Galaxy Tab", "tablets", "good", { storage: "64 GB", os: "Android" }),
];
