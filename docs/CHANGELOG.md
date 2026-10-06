# Histórico de alterações (por fase)

Registo detalhado do que foi construído e verificado em cada fase. O README descreve o estado final.

## Estrutura
- `src/app` — rotas (UI). Sem lógica de negócio.
- `src/services/pricing.ts` — único sítio com o cálculo de custo/margem (cêntimos, inteiros).
- `src/server` — acesso a dados (hoje demo), auth (`requireStaff`).
- `src/lib` — config, i18n (`pt-PT`), validação zod, WhatsApp, eventos n8n, clientes Supabase.
- `supabase/migrations` — esquema + RLS.

## Decisões de segurança
- Dados de fornecedor (custo, URL, disponibilidade) estão em `supplier_listings` (só staff), não em `product_variants`, porque RLS não filtra colunas.
- Escritas públicas (pedidos, requests) vão por API server-side com service role após validação zod; sem policies de insert anónimo.
- `/admin`: middleware (falha fechada) + `requireStaff()` com verificação de role.

## Fase 2 (feita)
- `/request` + `POST /api/custom-requests`: cria cliente + pedido personalizado, devolve referência, botão WhatsApp.
- `/checkout?product=slug` (5 etapas) + `POST /api/orders`: o preço é lido sempre da BD; sem preço configurado cria cotação em rascunho; com preço cria encomenda (pagamento a confirmar). Não compra ao fornecedor.
- Login admin (Supabase Auth). `supabase/seed.sql` com os 8 produtos demo.
- Anti-spam: honeypot + rate limit em memória (trocar por store partilhado em produção).
- Eventos emitidos: `order.created`, `quote.created`.

## Fase 3 (feita) — Admin
- Layouts separados: `(site)` público e `admin/(panel)` (autorização com `requireStaff()` no layout, middleware como 1.ª barreira, RLS como 2.ª).
- Dashboard (`summarize()` em `services/dashboard.ts`), pedidos (estados validados em `services/order-status.ts`, eventos n8n nas transições, "Supplier Order" só por ação humana), cotações (custos → margem via `services/pricing.ts`, margem alvo, enviar/aceitar/rejeitar/converter em pedido), produtos (CRUD, ativar/desativar, preços PT/AO, fornecedor/disponibilidade), pedidos de sourcing, clientes, fornecedores.
- Todas as mutações são server actions que revalidam o utilizador; o admin usa a sessão do utilizador (não a service role).
- Limitação do MVP: o formulário de produto edita a variante principal (uma por produto) e um fornecedor.

## Fase 4 (feita) — Catálogo e qualidade
- Catálogo: filtros por pesquisa, categoria, marca, condição, RAM, armazenamento, sistema operativo e preço (país selecionado), ordenação e paginação (12/página). Lógica pura em `services/catalog.ts` (testada). As opções de filtro vêm dos dados reais: um filtro sem dados não aparece. Os filtros funcionam sem JavaScript (formulário GET).
- Migração `0002_variant_os.sql` (campo `os` na variante, editável no admin). Aplicar antes de usar o filtro.
- Produto: galeria, especificações, secções de inclusões/entrega/garantia (texto neutro, sem prazos nem garantias inventados), JSON-LD `Product` (só produtos não-demo; `BackOrder` + `RefurbishedCondition`) e `BreadcrumbList`. 404 real para slugs inexistentes.
- SEO: canonical sem filtros; páginas filtradas/paginadas e produtos demo com `noindex`.
- Imagens: `next/image` para ficheiros locais e Supabase Storage (host derivado de `NEXT_PUBLIC_SUPABASE_URL`); outros URLs https usam `<img loading="lazy">`.
- Performance: leitura da BD em cache 60 s (tag `products`, invalidada pelo admin); skeletons em `/products`.
- UX/a11y: `error.tsx` (site e admin), `not-found.tsx`, breadcrumbs, `aria-current` na navbar, Escape fecha o menu, foco no erro após submissão falhada e no passo do checkout.
- Limitação: filtragem em memória (adequada para algumas centenas de produtos; acima disso, mover para queries SQL).
- Não implementado: ícone de carrinho na navbar (o fluxo atual é uma encomenda por produto).

## Fase 5 (feita) — IA e automação (preparadas, sem automatizar compras)
- `src/ai/`: pesquisa NL (`nl-search.ts`), guarda de conteúdo, rascunho de descrição, FAQ verificado, ranking interno, provider LLM opcional. Detalhes e eventos em `docs/AUTOMATION.md`.
- Endpoints: `POST /api/ai/search`, `POST /api/ai/support`, `POST /api/automation/supplier-listings` (HMAC + anti-replay, falha fechada).
- Eventos de saída assinados com timestamp (`X-Timestamp` + `X-Signature`).
- Nova página `/faq` (com JSON-LD FAQPage) e admin `/admin/ranking`.
- Testes: 23 (margem, estados, dashboard, catálogo, assinatura, IA).

## Antes de produção (checklist)
- Aplicar migrações `0001`, `0002` e (opcional) `seed.sql`; criar o 1.º admin em `profiles`.
- Definir variáveis de ambiente (`.env.example`), nome da marca (`src/lib/config.ts`), WhatsApp e redes sociais.
- Rever textos legais (`/legal/*`) e condições de garantia/devolução com assessoria jurídica.
- Trocar o rate limit em memória por um store partilhado.
- Fornecer fotografias; ligar pagamentos (Stripe/outros) e envio; testar o fluxo com uma base Supabase real.
- Testar a integração LLM com chave real (não testada).

## Fase 6 (feita) — Fecho da checklist de produção
- **Base de dados validada num Postgres real** (`python3 supabase/tests/rls_test.py`, 25 verificações): migrações 0001–0003 + seed, RLS (anon/cliente/staff), constraints e FKs. Encontrou e corrigiu uma dependência desnecessária de `pgcrypto`.
- **Segurança**: rate limit partilhado (Upstash Redis REST, com fallback em memória), CSP + HSTS em produção, `npm audit` a 0 (override do `postcss` aninhado no Next), CI em `.github/workflows/ci.yml`.
- **Pagamentos (preparados)**: interface `PaymentProvider`, Stripe Checkout (só para encomendas Confirmed, valor lido da BD), webhook com assinatura verificada, idempotente e com conferência de valor/moeda (`/api/webhooks/stripe`, migração `0003`). Link gerado no admin.
- **Backend FastAPI** (`backend/`): JWT Supabase (HS256/JWKS), role via `profiles`, receptor de eventos HMAC com vetor de paridade com o Next.js. 10 testes.
- Testes: 27 (Node) + 25 (Postgres) + 10 (FastAPI).

## Fase 7 (feita) — Testes ponta a ponta contra Postgres + PostgREST reais
`sh supabase/tests/run_e2e.sh` sobe um stack equivalente ao Supabase (Postgres + PostgREST + proxy `/rest/v1` + stub de `auth/v1/user`), corre a app Next.js em produção e executa as suites abaixo (+ a11y, fase 8):
- **públicos**: catálogo lido da BD, ausência de fugas de dados de fornecedor, pedidos/encomendas/cotações, preço do cliente ignorado, margem correta.
- **admin** (sessão de staff real via cookie `@supabase/ssr`): 13 páginas, redirecionamentos para anónimos e clientes sem role, transições de estado, cotações (margem alvo → enviar → aceitar → converter), CRUD de produtos/fornecedores, validações.
- **webhook Stripe**: pago, idempotência, valor/moeda divergentes, eventos malformados.
Encontrou e corrigiu: orderId inexistente/malformado no webhook devolvia 500 (a Stripe repetiria para sempre). `docs/DEPLOY.md` tem o guia de deploy e a verificação pós-deploy.

## Fase 8 (feita) — Acessibilidade automatizada e envios
- `supabase/tests/a11y.mjs` (axe-core + jsdom, dentro de `run_e2e.sh`): audita 24 páginas (públicas e admin, com sessão) — 0 violações. Não avalia contraste de cores nem layout: fazer uma revisão manual (teclado, leitor de ecrã, contraste) antes de lançar.
- Corrigido: a página 404 de URLs sem rota e o login do admin não tinham `<main>`; a 404 geral perdia navbar/footer.
- Nova página `/admin/shipping`: encomendas já recebidas em Portugal e ainda por entregar (moradas, estado de envio).
- O e2e passou a ter 79 verificações; o teste do webhook cria os seus próprios dados (independente das outras suites).

## Fase 9 (feita) — Várias variantes por produto
- Admin: o produto edita-se à parte; cada variante (RAM, armazenamento, SO, cor, preços PT/AO, fornecedor, custo, disponibilidade) tem o seu formulário; adicionar e apagar variantes (bloqueado se tiver encomendas ou se for a última).
- Loja: seletor de configuração na página de produto (`?v=`, funciona sem JavaScript), cartões com "desde X €" e nº de configurações, checkout e encomenda por variante (preço sempre lido da BD), JSON-LD com uma oferta por variante e país.
- Migração `0004` (ordem estável das variantes). Aplicar antes de usar.
- e2e: 90 verificações (incl. 15 sobre variantes) + auditoria axe sem violações.

## Não verificado (precisa de credenciais reais)
- Criação de sessões Stripe contra a API real (a verificação de assinatura e a lógica de BD do webhook estão testadas).
- Métodos de pagamento para Angola (Stripe só está ativo para Portugal; usar link/transferência manual ou outro fornecedor).
- Integração LLM, o GoTrue real (login por palavra-passe; nos testes usa-se um stub), e o backend FastAPI com JWKS real.

## Fases (histórico do plano)
1. **Base (esta)**: config, tipos, esquema+RLS, margem, validação, layout, home, catálogo/produto básicos (demo), SEO, middleware admin.
2. Pedido personalizado, cotações, checkout, API + eventos.
3. Admin (dashboard, CRUD produtos, pedidos, cotações, margens).
4. Filtros reais, paginação, imagens, SEO schema.org, acessibilidade/QA.
5. AI (pesquisa, descrições, ranking, suporte) e n8n.

## Limitações conhecidas / próximos passos
- Sem carrinho (uma encomenda por produto); o ícone de carrinho da navbar não foi implementado.
- Fotografias: o admin aceita URLs; upload direto para o Storage do Supabase não está implementado.
- i18n: textos principais centralizados em `src/lib/i18n/pt-PT.ts`, mas muitas páginas ainda têm texto inline; migrar antes de acrescentar outra língua.
- Textos legais e condições de garantia/devolução são placeholders: precisam de revisão jurídica.

## Fase 10 (feita) — Carrinho e versão 1.0.0
- Carrinho em cookie (só IDs e quantidades; preços sempre lidos da BD), com ações de servidor (adicionar, atualizar, remover, esvaziar) que funcionam sem JavaScript. Ícone com contagem na navbar. Máximo 20 linhas, 10 unidades por linha.
- Só entram no carrinho equipamentos com preço; produtos sob consulta continuam a seguir "Pedir cotação". Se o destino mudar para um país onde um item não tem preço, o carrinho avisa e bloqueia o checkout; a API devolve 422 sem criar dados.
- Checkout generalizado: `/checkout` (carrinho) e `/checkout?product=…` (encomendar agora). `POST /api/orders` aceita vários itens (e o formato antigo de um item), junta linhas repetidas, calcula total e margem por linha e limpa o carrinho após a encomenda.
- e2e: 118 verificações (incl. 28 do carrinho) + auditoria axe (incl. `/cart` e `/checkout`) sem violações; testes unitários: 33.
