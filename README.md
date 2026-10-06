# Zamora Connect — v1.0.0

Plataforma de sourcing e revenda **sem stock próprio**

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres, Auth, RLS) · Netlify · FastAPI (opcional) · Stripe (opcional) · n8n/IA (opcional).

## O que inclui
- **Loja:** home, catálogo (pesquisa, filtros reais, ordenação, paginação), páginas de produto com várias configurações, **carrinho**, checkout (carrinho ou "encomendar agora"), pedido de equipamento personalizado, FAQ, SEO (metadata, sitemap, robots, JSON-LD), PT/AO.
- **Admin (`/admin`):** dashboard, pedidos (estados validados), cotações (custos → margem → enviar/aceitar/converter), produtos e variantes, pedidos de sourcing, clientes, fornecedores, envios, ranking interno, rascunhos de descrição por IA.
- **Regras de negócio:** margem calculada num só serviço (`src/services/pricing.ts`); preços lidos sempre da base de dados; "Supplier Order" só por ação humana; dados de fornecedor nunca expostos ao público (tabela separada + RLS).
- **Preparado para:** pagamentos Stripe, automação n8n (eventos assinados), IA (pesquisa em linguagem natural, FAQ verificada), backend FastAPI.
