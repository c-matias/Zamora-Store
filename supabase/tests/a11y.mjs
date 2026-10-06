// Auditoria de acessibilidade automática (axe-core + jsdom) sobre o HTML servido. Não avalia contraste nem layout.
import { JSDOM } from "jsdom";
import axe from "axe-core";
import fs from "node:fs";

const BASE = "http://localhost:3071";
const cookie = fs.readFileSync("/tmp/cs.txt", "utf8").trim();
const [ORDER, QUOTE, PROD] = fs.readFileSync("/tmp/ids.txt", "utf8").trim().split(/\s+/);
const env = Object.fromEntries(fs.readFileSync("/tmp/e2e.env", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const cartCookie = "cart=" + encodeURIComponent(JSON.stringify([{ v: env.VARIANT, q: 2 }]));
const pages = [
  ["/", false], ["/products", false], ["/products?category=laptops&ram=16%20GB", false], ["/products/dell-latitude-5420", false],
  ["/request", false], ["/cart", false], ["/cart#com-itens", "cart"], ["/checkout", "cart"], ["/checkout?product=dell-latitude-5420", false], ["/faq", false], ["/legal/termos", false], ["/nao-existe", false],
  ["/admin/login", false],
  ["/admin", true], ["/admin/orders", true], ["/admin/shipping", true], [`/admin/orders/${ORDER}`, true], ["/admin/quotes", true], [`/admin/quotes/${QUOTE}`, true], ["/admin/quotes/new", true],
  ["/admin/products", true], [`/admin/products/${PROD}`, true], ["/admin/products/new", true], ["/admin/requests", true], ["/admin/customers", true], ["/admin/suppliers", true], ["/admin/ranking", true],
];
let total = 0;
for (const [path, auth] of pages) {
  const res = await fetch(BASE + path, { headers: auth === "cart" ? { cookie: cartCookie } : auth ? { cookie } : {}, redirect: "follow" });
  const html = await res.text();
  const dom = new JSDOM(html, { runScripts: "outside-only", url: BASE + path });
  dom.window.eval(axe.source);
  const r = await dom.window.axe.run(dom.window.document, { rules: { "color-contrast": { enabled: false } }, resultTypes: ["violations"] });
  const v = r.violations;
  total += v.length;
  console.log(`${v.length === 0 ? "PASS" : "FAIL"} ${path} (${res.status})`);
  for (const x of v) console.log(`   - [${x.impact}] ${x.id}: ${x.help} → ${x.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")} (${x.nodes.length}×)`);
}
console.log(total === 0 ? "\nSem violações axe." : `\n${total} violações axe.`);
process.exit(total === 0 ? 0 : 1);
