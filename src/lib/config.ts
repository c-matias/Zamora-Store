export const siteConfig = {
  name: "Nome da Marca", // TODO: definir nome da marca
  locale: "pt-PT",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  currency: "EUR",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "",
  social: {
    instagram: "",
    facebook: "",
    tiktok: "",
  },
} as const;

export const COUNTRIES = [
  { code: "PT", label: "Portugal", flag: "🇵🇹" },
  { code: "AO", label: "Angola", flag: "🇦🇴" },
] as const;

export const COUNTRY_COOKIE = "country";
