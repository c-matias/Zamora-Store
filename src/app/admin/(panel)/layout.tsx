import Link from "next/link";
import { requireStaff } from "@/server/auth";
import { signOut } from "../_actions/auth";
import { siteConfig } from "@/lib/config";

export const metadata = { robots: { index: false, follow: false } };

const nav = [
  ["/admin", "Dashboard"], ["/admin/orders", "Pedidos"], ["/admin/shipping", "Envios"], ["/admin/requests", "Pedidos de sourcing"],
  ["/admin/quotes", "Cotações"], ["/admin/products", "Produtos"], ["/admin/customers", "Clientes"], ["/admin/suppliers", "Fornecedores"], ["/admin/ranking", "Ranking"],
] as const;

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-page flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <Link href="/admin" className="font-semibold text-navy-900">{siteConfig.name} · Admin</Link>
          <nav aria-label="Administração" className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
            {nav.map(([href, label]) => <Link key={href} href={href} className="hover:text-navy-700">{label}</Link>)}
          </nav>
          <form action={signOut} className="ml-auto"><button className="text-sm text-ink-soft underline">Terminar sessão</button></form>
        </div>
      </header>
      <main className="mx-auto max-w-page px-4 py-8">{children}</main>
    </div>
  );
}
