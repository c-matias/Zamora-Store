import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { NotFoundContent } from "@/components/ui/NotFoundContent";
import { getCountry } from "@/lib/country";
import { readCartCount } from "@/server/cart";

/** URLs sem rota: o layout do site não se aplica, por isso inclui navbar, <main> e footer. */
export default async function RootNotFound() {
  return (
    <>
      <Navbar country={await getCountry()} cartCount={await readCartCount()} />
      <main id="conteudo"><NotFoundContent /></main>
      <Footer />
    </>
  );
}
