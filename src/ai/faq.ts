/** Base de conhecimento do apoio ao cliente. Só afirmações verificáveis; o resto vai para contacto humano. */
export interface Faq { id: string; question: string; answer: string; keywords: string[] }

export const FAQS: Faq[] = [
  { id: "stock", question: "Os equipamentos estão em stock?", keywords: ["stock", "disponivel", "disponibilidade", "armazem"],
    answer: "Não mantemos stock próprio. Os equipamentos são adquiridos sob encomenda e estão sujeitos à disponibilidade do fornecedor, que confirmamos antes de avançar." },
  { id: "how", question: "Como funciona a encomenda?", keywords: ["como", "funciona", "encomenda", "encomendar", "passos", "processo"],
    answer: "Escolhe o equipamento, confirmamos disponibilidade e preço, recebemos e verificamos o equipamento em Portugal e enviamos para si." },
  { id: "angola", question: "Entregam em Angola?", keywords: ["angola", "luanda", "envio", "enviam", "entregam", "alfandega", "impostos", "encargos"],
    answer: "Sim. Fazemos o sourcing na Europa, a receção e o controlo em Portugal e o envio para Angola. Os custos de transporte e eventuais encargos aplicáveis são confirmados antes da conclusão da encomenda." },
  { id: "delivery-time", question: "Qual é o prazo de entrega?", keywords: ["prazo", "demora", "quando", "tempo", "chega", "dias"],
    answer: "Não indicamos prazos fixos. O prazo estimado é confirmado na cotação, depois de verificarmos o fornecedor e o destino." },
  { id: "payment", question: "Como posso pagar?", keywords: ["pagar", "pagamento", "multibanco", "cartao", "transferencia", "mbway"],
    answer: "O pagamento fica a confirmar. Indicamos os métodos disponíveis para o seu país na cotação, antes de qualquer pagamento." },
  { id: "custom", question: "Posso pedir um equipamento que não está no catálogo?", keywords: ["catalogo", "especifico", "procuro", "modelo", "pedir", "pedido", "cotacao", "orcamento"],
    answer: "Sim. Use a página “Pedir equipamento” com o modelo, orçamento e especificações; procuramos opções junto dos nossos fornecedores e enviamos uma cotação." },
  { id: "quality", question: "Os equipamentos são verificados?", keywords: ["verificado", "verificacao", "qualidade", "inspecao", "controlo", "testado", "estado"],
    answer: "Sim. Cada equipamento é recebido em Portugal e passa por inspeção e controlo de qualidade antes do envio." },
  { id: "warranty", question: "Há garantia e devoluções?", keywords: ["garantia", "devolucao", "devolver", "devolucoes", "troca", "reembolso"],
    answer: "As condições de garantia e devolução aplicáveis a cada equipamento são indicadas na cotação. Consulte também a política de devoluções." },
];

const strip = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function answerFaq(question: string): { matched: boolean; faq?: Faq } {
  const words = new Set(strip(question.slice(0, 300)).split(/[^a-z0-9]+/).filter((w) => w.length > 2));
  let best: { faq: Faq; score: number } | undefined;
  for (const faq of FAQS) {
    const score = faq.keywords.filter((k) => words.has(k)).length;
    if (score > 0 && (!best || score > best.score)) best = { faq, score };
  }
  return best ? { matched: true, faq: best.faq } : { matched: false };
}
