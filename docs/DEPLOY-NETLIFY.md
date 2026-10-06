# Deploy no Netlify

Este projecto usa Next.js 15 App Router e pode ser publicado no Netlify com o suporte nativo de Next.js.

## Build

- Build command: `npm run build`
- Publish directory: `.next`
- Node.js: 20

## Variáveis obrigatórias

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`

## Variáveis opcionais

- `N8N_WEBHOOK_URL`
- `N8N_WEBHOOK_SECRET`
- `ANTHROPIC_API_KEY`
- `AI_MODEL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Nunca colocar chaves secretas no repositório Git.

## Deploy

1. Fazer push deste directório para GitHub/GitLab/Bitbucket.
2. No Netlify, importar o repositório.
3. Manter o comando `npm run build` e publish directory `.next`.
4. Adicionar as variáveis de ambiente no Netlify.
5. Fazer o deploy.

As rotas App Router, Route Handlers, middleware e `next/image` são suportadas pelo adapter actual do Netlify.
