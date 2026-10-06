export type Country = "PT" | "AO";
export type Category = "laptops" | "smartphones" | "tablets" | "accessories";
export type Condition = "excellent" | "very_good" | "good" | "acceptable";
export type ProductStatus = "draft" | "active" | "inactive";
export type SupplierAvailability = "unknown" | "available" | "unavailable" | "on_request";

export type OrderStatus =
  | "pending" | "quote" | "confirmed" | "supplier_order" | "received"
  | "quality_check" | "ready_to_ship" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "to_confirm" | "paid" | "refunded" | "failed";
export type ShippingStatus = "not_shipped" | "preparing" | "shipped" | "delivered";
export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";
export type CustomRequestStatus = "new" | "in_review" | "quoted" | "closed";
export type UserRole = "admin" | "staff" | "customer";

/** Valores monetários em cêntimos (inteiros) na moeda base EUR. */
export type Cents = number;

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  model: string;
  category: Category;
  description: string;
  condition: Condition;
  status: ProductStatus;
  images: string[];
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Parte pública da variante: NUNCA inclui dados de fornecedor. */
export interface ProductVariant {
  id: string;
  productId: string;
  cpu: string | null;
  ram: string | null;
  storage: string | null;
  color: string | null;
  os: string | null;
  condition: Condition;
  sellingPricePT: Cents | null;
  sellingPriceAO: Cents | null;
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

export interface Supplier {
  id: string;
  name: string;
  website: string | null;
  country: string | null;
  status: "active" | "inactive";
  notes: string | null;
}

/** Apenas admin. Contém custo e disponibilidade do fornecedor. */
export interface SupplierListing {
  id: string;
  supplierId: string;
  productVariantId: string;
  supplierUrl: string | null;
  supplierPrice: Cents | null;
  availability: SupplierAvailability;
  lastCheckedAt: string | null;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: Country;
  city: string;
  address: string | null;
  postalCode: string | null;
  createdAt: string;
}
