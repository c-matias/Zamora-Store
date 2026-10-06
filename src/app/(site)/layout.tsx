import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getCountry } from "@/lib/country";
import { readCartCount } from "@/server/cart";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const country = await getCountry();
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Saltar para o conteúdo
      </a>
      <Navbar country={country} cartCount={await readCartCount()} />
      <main id="conteudo">{children}</main>
      <Footer />
    </>
  );
}
