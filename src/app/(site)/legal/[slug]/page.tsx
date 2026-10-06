import { notFound } from "next/navigation";

const pages: Record<string, string> = {
  privacidade: "Política de privacidade",
  termos: "Termos e condições",
  devolucoes: "Política de devoluções",
};

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = pages[slug];
  if (!title) notFound();
  return (
    <div className="mx-auto max-w-page px-4 py-16">
      <h1 className="text-3xl font-semibold text-navy-950">{title}</h1>
      <p className="mt-3 text-ink-soft">Conteúdo legal a fornecer e rever antes de produção.</p>
    </div>
  );
}
