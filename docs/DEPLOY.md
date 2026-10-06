# Guia de deploy (Vercel + Supabase)

## 1. Supabase
1. Criar projeto (região UE). Em **SQL Editor**, executar por ordem: `supabase/migrations/0001_init.sql`, `0002_variant_os.sql`, `0003_payments.sql`, `0004_variant_created_at.sql`. (Opcional, só para demo: `supabase/seed.sql`.)
2. **Authentication → Providers**: ativar Email; desativar registo público (*Allow new users to sign up* off) — o admin é criado manualmente.
3. Criar o 1.º utilizador em **Authentication → Users** e promovê-lo (SQL Editor):
   ```sql
   insert into profiles (id, role) select id, 'admin' from auth.users where email = 'o-teu@email.pt';
   ```
4. Copiar de **Project Settings → API**: `URL`, `anon key`, `service_role key` (esta NUNCA no browser).
5. (Opcional) **Storage**: bucket público `products` para fotografias; usar URLs `https://<projeto>.supabase.co/storage/v1/object/public/products/...` (otimizadas pelo Next).

## 2. Variáveis de ambiente (Vercel → Settings → Environment Variables)
| Variável | Notas |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL final (https) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | públicas |
| `SUPABASE_SERVICE_ROLE_KEY` | só servidor |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | só dígitos, formato internacional |
| `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET` | opcional (automação) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | rate limit partilhado (recomendado) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | opcional (pagamentos) |
| `ANTHROPIC_API_KEY`, `AI_MODEL` | opcional (IA) |

Editar também `src/lib/config.ts` (nome da marca, redes sociais).

## 3. Vercel
Importar o repositório (Framework: Next.js). Build: `npm run build`. Depois do 1.º deploy, associar o domínio.

## 4. Stripe (opcional)
Dashboard → Developers → Webhooks → endpoint `https://<dominio>/api/webhooks/stripe`, eventos `checkout.session.completed` e `checkout.session.async_payment_succeeded`; copiar o *signing secret* para `STRIPE_WEBHOOK_SECRET`. Validar com a Stripe que os métodos pretendidos estão disponíveis para a tua conta. Para Angola não há fornecedor ativo: usar pagamento manual (marcar como pago no admin).

## 5. Backend FastAPI (opcional)
`backend/` tem Dockerfile (Fly.io/Render/Railway). Variáveis em `backend/.env.example`; `ALLOWED_ORIGINS` = domínio da loja.

## 6. Verificação pós-deploy (fazer uma encomenda de ponta a ponta)
- [ ] `/admin` sem sessão redireciona para `/admin/login`; com a conta admin entra.
- [ ] Criar um produto real (preço PT, fornecedor, custo) e ativá-lo; aparece em `/products` e no `sitemap.xml`.
- [ ] Submeter um pedido em `/request` e uma encomenda em `/checkout`; ver em `/admin` (pedidos, cotações, clientes).
- [ ] Mudar estados do pedido até Delivered; confirmar que `Supplier Order` só avança por clique humano.
- [ ] Na consola Supabase, confirmar que um pedido anónimo à API REST **não** devolve `supplier_listings` nem `customers`.
- [ ] Revisar `/legal/*` e condições de garantia com um jurista antes de abrir ao público.
