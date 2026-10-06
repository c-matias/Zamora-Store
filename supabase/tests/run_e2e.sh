#!/bin/sh
# Teste ponta a ponta local: Postgres + PostgREST (stack equivalente ao Supabase) + Next.js em produção.
# Requisitos: pip install pgserver psycopg2-binary pyjwt requests; PostgREST em /tmp/pgrst/postgrest
cd "$(dirname "$0")/../.."
stop() { ps aux | grep -E "[e]2e_stack|[p]ostgrest|[n]ext-server|[n]ext start" | awk '{print $2}' | xargs -r kill 2>/dev/null; }
stop; rm -f /tmp/e2e.env; sleep 1
setsid nohup python3 supabase/tests/e2e_stack.py >/tmp/stack.log 2>&1 < /dev/null &
for i in $(seq 1 25); do sleep 2; [ -f /tmp/e2e.env ] && break; done; sleep 3
. /tmp/e2e.env
[ -d .next ] || npm run build >/dev/null 2>&1
setsid nohup env STRIPE_SECRET_KEY=sk_test_e2e STRIPE_WEBHOOK_SECRET=whsec_e2e NEXT_PUBLIC_SUPABASE_URL=$URL NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON SUPABASE_SERVICE_ROLE_KEY=$SERVICE npx next start -p 3071 >/tmp/next-e2e.log 2>&1 < /dev/null &
sleep 6
echo "===== fluxos públicos"; python3 supabase/tests/e2e_public.py; PUB=$?
# sessão de staff (cookie @supabase/ssr) + IDs
python3 - <<'PY'
import json, base64, jwt, requests
env = dict(l.split("=", 1) for l in open("/tmp/e2e.env").read().split("\n") if "=" in l)
h = {"apikey": env["SERVICE"], "Authorization": f"Bearer {env['SERVICE']}"}
first = lambda p: requests.get(f"{env['URL']}/rest/v1/{p}", headers=h).json()[0]["id"]
sess = {"access_token": env["STAFF"], "token_type": "bearer", "expires_in": 36000, "expires_at": 4102444800, "refresh_token": "x",
        "user": {"id": env["STAFF_ID"], "aud": "authenticated", "role": "authenticated", "email": "t@x.com", "app_metadata": {}, "user_metadata": {}, "created_at": "2026-01-01T00:00:00Z"}}
open("/tmp/cs.txt", "w").write("sb-127-auth-token=base64-" + base64.urlsafe_b64encode(json.dumps(sess).encode()).decode().rstrip("="))
open("/tmp/ids.txt", "w").write(" ".join([first("orders?select=id&order=created_at.asc"), first("quotes?select=id"), first("products?select=id&slug=eq.dell-latitude-5420"), env["STAFF_ID"]]))
PY
echo "===== ações do admin"; python3 supabase/tests/e2e_admin.py; ADM=$?
echo "===== acessibilidade (axe)"; node supabase/tests/a11y.mjs; A11Y=$?
echo "===== webhook Stripe"; python3 supabase/tests/e2e_webhook.py; WH=$?
stop
[ $PUB -eq 0 ] && [ $ADM -eq 0 ] && [ $WH -eq 0 ] && [ $A11Y -eq 0 ]
