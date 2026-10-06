import type { Metadata } from "next";
import Link from "next/link";
import { FAQS } from "@/ai/faq";
import { JsonLd } from "@/components/ui/JsonLd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { whatsappLink, whatsappMessages } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Perguntas frequentes", alternates: { canonical: "/faq" } };

export default function FaqPage() {
  const wa = whatsappLink(whatsappMessages.general());
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }} />
      <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Perguntas frequentes" }]} />
      <h1 className="mt-4 text-3xl font-semibold text-navy-950">Perguntas frequentes</h1>
      <dl className="mt-8 space-y-6">
        {FAQS.map((f) => (<div key={f.id}><dt className="font-semibold">{f.question}</dt><dd className="mt-1 text-ink-soft">{f.answer}</dd></div>))}
      </dl>
      <p className="mt-10 text-ink-soft">Não encontrou a resposta? <Link className="underline" href="/request">Peça um equipamento</Link>{wa && <> ou <a className="underline" href={wa} target="_blank" rel="noopener noreferrer">fale connosco no WhatsApp</a></>}.</p>
    </div>
  );
}
