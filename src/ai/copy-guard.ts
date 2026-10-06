/** Rejeita texto gerado que viole as regras de conteúdo (sem superlativos, promessas ou escassez artificial). */
const strip = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const BANNED: [RegExp, string][] = [
  [/\b(o|a) melhor\b/, "superlativo (“o melhor”)"],
  [/\bmais barato\b/, "“o mais barato”"],
  [/\b100\s*%\s*garanti/, "“100% garantido”"],
  [/\bentrega garantida\b/, "entrega garantida"],
  [/\bstock limitado\b|\bultimas unidades\b/, "escassez artificial"],
  [/\bem stock\b/, "“em stock” (os produtos são por encomenda)"],
  [/\bnumero 1\b|\bn[ºo°]\s*1\b/, "“número 1”"],
  [/\bmilhares de clientes\b/, "número de clientes não verificável"],
];

export function findBannedClaims(text: string): string[] {
  const s = strip(text);
  return BANNED.filter(([re]) => re.test(s)).map(([, label]) => label);
}
