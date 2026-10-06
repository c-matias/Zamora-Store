import { siteConfig } from "@/lib/config";

/** Constrói link wa.me com mensagem pré-preenchida. Devolve null se não houver número configurado. */
export function whatsappLink(message: string): string | null {
  const number = siteConfig.whatsappNumber.replace(/\D/g, "");
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export const whatsappMessages = {
  product: (name: string) => `Olá, gostaria de saber mais sobre o ${name}.`,
  request: (id: string) => `Olá, submeti o pedido #${id} e gostaria de obter uma cotação.`,
  general: () => "Olá, gostaria de falar sobre um equipamento.",
};
