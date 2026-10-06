import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { t } from "@/lib/i18n/pt-PT";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

const legal = [
  { href: "/legal/privacidade", label: "Política de privacidade" },
  { href: "/legal/termos", label: "Termos e condições" },
  { href: "/legal/devolucoes", label: "Política de devoluções" },
];

export function Footer() {
  const wa = whatsappLink(whatsappMessages.general());
  const social = [
    { label: "Instagram", href: siteConfig.social.instagram },
    { label: "Facebook", href: siteConfig.social.facebook },
    { label: "TikTok", href: siteConfig.social.tiktok },
  ].filter((s) => s.href);

  return (
    <footer id="contactos" className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-page gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-semibold text-navy-900">{siteConfig.name}</p>
          <p className="mt-2 text-sm text-ink-soft">Eletrónica recondicionada por encomenda, para Portugal e Angola.</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Categorias</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            {(Object.keys(t.categories) as (keyof typeof t.categories)[]).map((c) => (
              <li key={c}><Link href={`/products?category=${c}`} className="hover:text-navy-700">{t.categories[c]}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Informação</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            <li><Link href="/#como-funciona" className="hover:text-navy-700">Como funciona</Link></li>
            <li><Link href="/request" className="hover:text-navy-700">Pedir equipamento</Link></li>
            <li><Link href="/faq" className="hover:text-navy-700">Perguntas frequentes</Link></li>
            {legal.map((l) => (<li key={l.href}><Link href={l.href} className="hover:text-navy-700">{l.label}</Link></li>))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Contactos</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft">
            {wa && <li><a href={wa} target="_blank" rel="noopener noreferrer" className="hover:text-navy-700">WhatsApp</a></li>}
            {social.map((s) => (<li key={s.label}><a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-navy-700">{s.label}</a></li>))}
            {!wa && social.length === 0 && <li>Canais de contacto por configurar.</li>}
          </ul>
        </div>
      </div>
    </footer>
  );
}
