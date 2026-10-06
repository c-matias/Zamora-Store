import type { Metadata } from "next";
import { RequestForm } from "@/components/forms/RequestForm";

export const metadata: Metadata = { title: "Pedir equipamento", alternates: { canonical: "/request" } };

export default function RequestPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold text-navy-950">Não encontrou o equipamento certo?</h1>
      <p className="mt-3 mb-8 text-ink-soft">Envie-nos o modelo, orçamento e especificações que procura. Procuramos opções disponíveis junto dos nossos fornecedores.</p>
      <RequestForm />
    </div>
  );
}
