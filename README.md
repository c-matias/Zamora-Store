# Loja de eletrónica recondicionada (Portugal · Angola) — v1.0.0

Plataforma de sourcing e revenda **sem stock próprio**: o cliente encomenda, uma pessoa confirma disponibilidade e preço junto do fornecedor, o equipamento é recebido e verificado em Portugal e depois enviado (Portugal ou Angola). Nunca há compra automática a fornecedores.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres, Auth, RLS) · Netlify · FastAPI (opcional) · Stripe (opcional) · n8n/IA (opcional).

## O que inclui
- **Loja:** home, catálogo (pesquisa, filtros reais, ordenação, paginação), páginas de produto com várias configurações, **carrinho**, checkout (carrinho ou "encomendar agora"), pedido de equipamento personalizado, FAQ, SEO (metadata, sitemap, robots, JSON-LD), PT/AO.
- **Admin (`/admin`):** dashboard, pedidos (estados validados), cotações (custos → margem → enviar/aceitar/converter), produtos e variantes, pedidos de sourcing, clientes, fornecedores, envios, ranking interno, rascunhos de descrição por IA.
- **Regras de negócio:** margem calculada num só serviço (`src/services/pricing.ts`); preços lidos sempre da base de dados; "Supplier Order" só por ação humana; dados de fornecedor nunca expostos ao público (tabela separada + RLS).
- **Preparado para:** pagamentos Stripe, automação n8n (eventos assinados), IA (pesquisa em linguagem natural, FAQ verificada), backend FastAPI.

## Como pôr a funcionar
1. **Supabase:** criar projeto, executar `supabase/migrations/0001…0004` (e opcionalmente `supabase/seed.sql`), criar o primeiro admin — passos exatos em **`docs/DEPLOY.md`**.
2. `cp .env.example .env.local` e preencher (URL/chaves do Supabase, WhatsApp, …).
3. `npm install && npm run dev` → http://localhost:3000 (admin em `/admin`).
4. Editar `src/lib/config.ts` (nome da marca, redes sociais). Deploy: Netlify (`docs/DEPLOY-NETLIFY.md`).

> Sem variáveis do Supabase a loja arranca em **modo demonstração** (8 produtos demo, sem preços; formulários devolvem "serviço não configurado").

## Verificação
| Comando | O que valida |
|---|---|
| `npm run verify` | tipos, testes unitários (33), migrações+RLS num Postgres real (25), backend FastAPI (10), `npm audit`, build |
| `npm run e2e` | stack local equivalente ao Supabase (Postgres + PostgREST) + app em produção: 118 verificações (loja, carrinho, admin com sessão real, webhook Stripe) + auditoria de acessibilidade axe |

Requisitos dos testes: `pip install pgserver psycopg2-binary pyjwt requests`, PostgREST em `/tmp/pgrst/postgrest` (ver `.github/workflows/ci.yml`). O CI executa tudo.

## Estrutura
- `src/app` — rotas: `(site)` público, `admin/(panel)`, `api/*`. Sem lógica de negócio nos componentes.
- `src/services` — lógica pura e testada (margem, catálogo, carrinho, estados, dashboard).
- `src/server` — acesso a dados e autenticação; `src/payments`, `src/ai`, `src/lib`.
- `supabase/` — migrações, seed e testes de BD/e2e. `backend/` — FastAPI. `docs/` — deploy, automação/IA, histórico.

## Segurança (resumo)
Admin com 3 camadas (middleware, `requireStaff()` em cada página/ação, RLS); sem políticas de escrita pública (pedidos passam por API com validação zod); rate limit partilhado (Upstash) com fallback; CSP/HSTS em produção; webhooks com assinatura e anti-replay; `npm audit` sem vulnerabilidades; segredos só no servidor.

## Limitações conhecidas
- Fotografias por URL (sem upload direto para o Storage).
- Textos legais (`/legal/*`) e condições de garantia/devolução são **placeholders**: precisam de revisão jurídica antes de abrir ao público.
- Pagamentos: Stripe só ativo para Portugal; para Angola, pagamento manual (marcar como pago no admin) ou outro fornecedor.
- Muitas páginas têm texto inline; migrar para `src/lib/i18n/` antes de acrescentar outra língua.
- A auditoria axe não cobre contraste de cores nem layout: fazer revisão manual (teclado, leitor de ecrã, contraste).

## Não verificado (exige credenciais/serviços reais)
Login real do Supabase (nos testes usa-se um stub do endpoint de utilizador), criação de sessões Stripe contra a API real, integração com o LLM, FastAPI com chaves JWKS reais. Fazer a checklist pós-deploy de `docs/DEPLOY.md` com uma encomenda de ponta a ponta.
