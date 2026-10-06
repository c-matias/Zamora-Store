"""Webhook Stripe contra o stack local (next start com STRIPE_WEBHOOK_SECRET=whsec_e2e)."""
import hashlib, hmac, json, sys, time, requests
env = dict(l.split("=", 1) for l in open("/tmp/e2e.env").read().split("\n") if "=" in l)
BASE, SECRET = "http://localhost:3071", "whsec_e2e"; fails = []
rest = lambda p: requests.get(f"{env['URL']}/rest/v1/{p}", headers={"apikey": env["SERVICE"], "Authorization": f"Bearer {env['SERVICE']}"}).json()
def check(n, ok, extra=""):
    print(("PASS" if ok else "FAIL"), n, extra)
    if not ok: fails.append(n)
def send(event):
    body = json.dumps(event); ts = str(int(time.time()))
    sig = hmac.new(SECRET.encode(), f"{ts}.{body}".encode(), hashlib.sha256).hexdigest()
    r = requests.post(BASE + "/api/webhooks/stripe", data=body, headers={"stripe-signature": f"t={ts},v1={sig}", "content-type": "application/json"})
    return r.status_code, (r.json().get("result") if r.ok else r.text[:80])
def session(evt, order, amount=None, status="paid", currency="eur", typ="checkout.session.completed", meta=True):
    return {"id": evt, "object": "event", "type": typ, "data": {"object": {"id": "cs_" + evt, "object": "checkout.session", "payment_status": status,
            "amount_total": amount, "currency": currency, "metadata": {"orderId": order} if meta else {}}}}

def mk_order(total):
    """Cria cliente + encomenda diretamente na BD (independente das outras suites e do rate limit da API)."""
    h = {"apikey": env["SERVICE"], "Authorization": f"Bearer {env['SERVICE']}", "Prefer": "return=representation", "Content-Type": "application/json"}
    c = requests.post(f"{env['URL']}/rest/v1/customers", headers=h, json={"name": "Wh", "email": "wh@example.com", "phone": "+351900000000", "country": "PT", "city": "Porto"}).json()[0]["id"]
    return requests.post(f"{env['URL']}/rest/v1/orders", headers=h, json={"customer_id": c, "destination": "PT", "subtotal": total, "total": total}).json()[0]
o1, o2, o3 = mk_order(12345), mk_order(23456), mk_order(34567)
get = lambda oid: rest(f"orders?id=eq.{oid}&select=payment_status,payment_provider,payment_reference")[0]
events = lambda: {e["id"] for e in rest("payment_events?select=id")}

check("pagamento confirmado marca a encomenda como paga", send(session("evt_ok", o1["id"], o1["total"])) == (200, "processed") and get(o1["id"])["payment_status"] == "paid")
g = get(o1["id"]); check("fornecedor e referência guardados", g["payment_provider"] == "stripe" and g["payment_reference"] == "cs_evt_ok")
check("evento repetido é idempotente (duplicate)", send(session("evt_ok", o1["id"], o1["total"])) == (200, "duplicate"))
check("valor diferente NÃO marca como pago", send(session("evt_amount", o2["id"], o2["total"] - 1)) == (200, "ignored") and get(o2["id"])["payment_status"] == "to_confirm")
check("moeda diferente NÃO marca como pago", send(session("evt_cur", o2["id"], o2["total"], currency="usd")) == (200, "ignored") and get(o2["id"])["payment_status"] == "to_confirm")
check("sessão não paga é ignorada", send(session("evt_unpaid", o2["id"], o2["total"], status="unpaid")) == (200, "ignored") and "evt_unpaid" not in events())
check("evento sem orderId é ignorado", send(session("evt_nometa", "", meta=False)) == (200, "ignored"))
check("tipo de evento irrelevante é ignorado", send(session("evt_other", o3["id"], o3["total"], typ="charge.refunded")) == (200, "ignored"))
check("orderId inexistente não dá 500 (Stripe não deve repetir para sempre)", send(session("evt_ghost", "00000000-0000-0000-0000-000000000001", 100)) == (200, "ignored"))
check("orderId que não é UUID não dá 500", send(session("evt_bad", "'; drop table orders;--", 100)) == (200, "ignored"))
check("encomenda real continua intacta", len(rest("orders?select=id")) >= 3)
print(f"\n{len(fails)} falhas" if fails else "\nTodos os testes e2e do webhook passaram"); sys.exit(1 if fails else 0)
