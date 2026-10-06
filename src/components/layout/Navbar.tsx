"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { COUNTRIES, COUNTRY_COOKIE, siteConfig } from "@/lib/config";
import { t } from "@/lib/i18n/pt-PT";

const links = [
  { href: "/", label: t.nav.home },
  { href: "/products?category=laptops", label: t.nav.laptops },
  { href: "/products?category=smartphones", label: t.nav.smartphones },
  { href: "/products?category=tablets", label: t.nav.tablets },
  { href: "/products?category=accessories", label: t.nav.accessories },
  { href: "/request", label: t.nav.request },
  { href: "/#como-funciona", label: t.nav.howItWorks },
  { href: "/#contactos", label: t.nav.contacts },
];

export function Navbar({ country, cartCount = 0 }: { country: "PT" | "AO"; cartCount?: number }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function setCountry(code: string) {
    document.cookie = `${COUNTRY_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-page items-center gap-4 px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-navy-900">{siteConfig.name}</Link>

        <nav aria-label="Principal" className="ml-6 hidden items-center gap-5 text-sm text-ink-soft lg:flex">
          {links.slice(1).map((l) => (
            <Link key={l.href} href={l.href} aria-current={pathname === l.href.split(/[?#]/)[0] && !l.href.includes("?") ? "page" : undefined} className="hover:text-navy-700">{l.label}</Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <label className="sr-only" htmlFor="country">País de destino</label>
          <select
            id="country"
            defaultValue={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-md border border-line bg-white px-2 py-1.5 text-sm"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.label}</option>
            ))}
          </select>
          <form action="/products" role="search" className="hidden md:block">
            <label htmlFor="q" className="sr-only">Pesquisar equipamentos</label>
            <input id="q" name="q" type="search" placeholder="Pesquisar" className="w-40 rounded-md border border-line px-3 py-1.5 text-sm" />
          </form>
          <Link href="/cart" aria-label={cartCount > 0 ? `Carrinho, ${cartCount} ${cartCount === 1 ? "item" : "itens"}` : "Carrinho, vazio"}
            className="relative rounded-md border border-line p-2 hover:bg-surface">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /><path d="M2 3h3l2.6 12.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L21 7H6" /></svg>
            {cartCount > 0 && <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 min-w-[1.25rem] rounded-full bg-navy-900 px-1 text-center text-xs font-medium leading-5 text-white">{cartCount}</span>}
          </Link>
          <button
            type="button"
            className="rounded-md border border-line px-3 py-1.5 text-sm lg:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Fechar" : "Menu"}
          </button>
        </div>
      </div>

      {open && (
        <nav id="menu-mobile" aria-label="Menu móvel" className="border-t border-line bg-white lg:hidden">
          <ul className="mx-auto max-w-page px-4 py-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block py-3 text-ink">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
