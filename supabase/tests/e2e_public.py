"""Fluxos públicos contra o stack local: leitura do catálogo, ausência de fugas e criação de pedidos/encomendas/cotações."""
import json, re, sys, urllib.parse, requests
env = dict(l.split("=", 1) for l in open("/tmp/e2e.env").read().split("\n") if "=" in l)
BASE = "http://localhost:3071"; fails = []
def check(n, ok, extra=""):
    print(("PASS" if ok else "FAIL"), n, extra)
    if not ok: fails.append(n)
rest = lambda p, k="SERVICE": requests.get(f"{env['URL']}/rest/v1/{p}", headers={"apikey": env[k], "Authorization": f"Bearer {env[k]}"}).json()

for u in ("/", "/products", "/products/dell-latitude-5420", "/products?category=laptops&ram=16%20GB", "/sitemap.xml", "/faq"):
    check(f"GET {u} = 200", requests.get(BASE + u).status_code == 200)
page = requests.get(BASE + "/products/dell-latitude-5420").text
check("preço de venda PT lido da BD (500,00 €)", "500,00" in page)
check("nenhum dado do fornecedor na página (custo/nome)", not any(x in page for x in ("Fornecedor X", "40000", "400,00")))
check("slug inexistente = 404", requests.get(BASE + "/products/nao-existe").status_code == 404)
nf = requests.get(BASE + "/nao-existe")
check("404 de URL sem rota mantém navbar e <main>", nf.status_code == 404 and "Pedir equipamento" in nf.text and "<main" in nf.text)
check("API pública (anon) não expõe supplier_listings", rest("supplier_listings?select=id", "ANON") == [])
check("API pública (anon) não expõe clientes", rest("customers?select=id", "ANON") == [])

r = requests.post(BASE + "/api/custom-requests", json={"category": "laptops", "budgetMax": "600", "ram": "16 GB", "notes": "x", "customer": {"name": "Ana Silva", "email": "ana@example.com", "phone": "+351 912 345 678", "country": "PT", "city": "Porto"}})
check("pedido personalizado criado (201)", r.status_code == 201, r.text[:60])
cr = rest("custom_requests?select=budget,destination,specifications")
check("orçamento guardado em cêntimos (60000) e destino PT", cr and cr[0]["budget"] == 60000 and cr[0]["destination"] == "PT")

vid = env["VARIANT"]
r = requests.post(BASE + "/api/orders", json={"variantId": vid, "quantity": 2, "destination": "PT", "customer": {"name": "Rui", "email": "rui@example.com", "phone": "+351911111111", "country": "PT", "city": "Lisboa", "address": "Rua A 1", "postalCode": "1000-001"}})
check("encomenda com preço criada", r.status_code == 201 and r.json()["kind"] == "order", r.text[:80])
o = rest("orders?select=total,subtotal,margin,status,payment_status,destination")
check("total=2×500€, margem=2×(500−400)€, pending/to_confirm", o and o[0]["total"] == 100000 and o[0]["margin"] == 20000 and o[0]["status"] == "pending" and o[0]["payment_status"] == "to_confirm", str(o))
r = requests.post(BASE + "/api/orders", json={"variantId": vid, "quantity": 1, "destination": "PT", "customer": {"name": "X", "email": "x@x.com", "phone": "+351911111111", "country": "PT", "city": "L"}, "unitPrice": 1})
check("preço enviado pelo cliente é ignorado", r.status_code == 201 and rest("order_items?select=unit_price&unit_price=eq.1") == [])

lv = rest("product_variants?select=id,products!inner(slug)&products.slug=eq.lenovo-thinkpad-t14-gen-2", "ANON")[0]["id"]
r = requests.post(BASE + "/api/orders", json={"variantId": lv, "quantity": 1, "destination": "AO", "customer": {"name": "Maria", "email": "maria@example.com", "phone": "+244923000000", "country": "AO", "city": "Luanda", "address": "Rua B"}})
check("sem preço → cotação em rascunho (AO)", r.status_code == 201 and r.json()["kind"] == "quote" and rest("quotes?select=status,destination")[0]["status"] == "draft")
r = requests.post(BASE + "/api/orders", json={"variantId": "00000000-0000-0000-0000-000000000000", "quantity": 1, "destination": "PT", "customer": {"name": "X", "email": "x@x.com", "phone": "+351911111111", "country": "PT", "city": "L"}})
check("variante inexistente = 404", r.status_code == 404, r.text[:60])
r = requests.post(BASE + "/api/orders", json={"variantId": vid, "quantity": 1, "destination": "PT", "customer": {"name": "", "email": "x", "phone": "1", "country": "PT", "city": ""}})
check("dados inválidos = 400 com erros por campo", r.status_code == 400 and "customer.email" in r.json()["fields"])

# =================== CARRINHO ===================
H_SVC = {"apikey": env["SERVICE"], "Authorization": f"Bearer {env['SERVICE']}", "Content-Type": "application/json", "Prefer": "return=minimal"}
hp = rest("product_variants?select=id,products!inner(slug)&products.slug=eq.hp-elitebook-840-g8", "ANON")[0]["id"]
lenovo = lv  # sem preço em nenhum país

class LocalSession(requests.Session):
    """O cookie do carrinho é Secure em produção; browsers aceitam-no em http://localhost, o cookiejar do Python não."""
    def request(self, *a, **kw):
        r = super().request(*a, **kw)
        for c in self.cookies: c.secure = False
        return r

def act(sess, page, must_have, fields, must_not=(), has_value=None):
    html = sess.get(BASE + page).text
    for block in html.split("<form")[1:]:
        m = re.search(r'name="(\$ACTION_ID_[0-9a-f]+)"', block)
        if m and all(f'name="{x}"' in block for x in must_have) and not any(f'name="{x}"' in block for x in must_not) and (has_value is None or f'value="{has_value}"' in block):
            data = {m.group(1): (None, "")}; data.update({k: (None, str(v)) for k, v in fields.items()})
            r = sess.post(BASE + page, files=data, headers={"Origin": BASE}, allow_redirects=False)
            return r.status_code, urllib.parse.unquote(r.headers.get("location", ""))
    raise AssertionError(f"formulário não encontrado em {page}: {must_have} {has_value}")

cart_json = lambda sess: json.loads(urllib.parse.unquote(sess.cookies.get("cart", "[]")))
order_count = lambda: len(rest("orders?select=id"))

cs = LocalSession()
check("carrinho vazio mostra mensagem", "O carrinho está vazio" in cs.get(BASE + "/cart").text)
check("checkout sem carrinho redireciona para /cart", cs.get(BASE + "/checkout", allow_redirects=False).headers.get("location") == "/cart")

code, loc = act(cs, "/products/dell-latitude-5420", ["variantId", "quantity"], {"variantId": vid, "quantity": 2})
check("adicionar ao carrinho (Dell ×2) → /cart", loc == "/cart" and cart_json(cs) == [{"v": vid, "q": 2}], str(cart_json(cs)))
code, loc = act(cs, "/products/hp-elitebook-840-g8", ["variantId", "quantity"], {"variantId": hp, "quantity": 1})
page = cs.get(BASE + "/cart").text
check("carrinho mostra os 2 produtos e o subtotal (1300,00 €)", "Dell Latitude 5420" in page and "HP EliteBook 840 G8" in page and "1300,00" in page)
check("navbar mostra o número de itens", "Carrinho, 3 itens" in page)
check("preços de fornecedor/margem não aparecem no carrinho", not any(x in page for x in ("400,00", "Fornecedor X")))

code, loc = act(cs, "/cart", ["variantId", "quantity"], {"variantId": hp, "quantity": 3}, has_value=hp)
check("atualizar quantidade (HP ×3)", {l["v"]: l["q"] for l in cart_json(cs)} == {vid: 2, hp: 3})
code, loc = act(cs, "/cart", ["variantId", "quantity"], {"variantId": hp, "quantity": 0}, has_value=hp)
check("quantidade 0 remove a linha", [l["v"] for l in cart_json(cs)] == [vid])
code, loc = act(cs, "/cart", ["variantId"], {"variantId": vid}, must_not=["quantity"], has_value=vid)
check("remover linha esvazia o carrinho", cart_json(cs) == [])
act(cs, "/products/dell-latitude-5420", ["variantId", "quantity"], {"variantId": vid, "quantity": 100})
check("quantidade máxima por linha (10)", cart_json(cs) == [{"v": vid, "q": 10}], str(cart_json(cs)))
act(cs, "/cart", ["variantId", "quantity"], {"variantId": vid, "quantity": 2}, has_value=vid)
act(cs, "/products/hp-elitebook-840-g8", ["variantId", "quantity"], {"variantId": hp, "quantity": 1})

code, loc = act(cs, "/products/lenovo-thinkpad-t14-gen-2", ["variantId", "quantity"], {"variantId": lenovo, "quantity": 1}) if "name=\"quantity\"" in cs.get(BASE + "/products/lenovo-thinkpad-t14-gen-2").text else (0, "sem botão")
check("produto sem preço NÃO tem botão de carrinho (só 'Pedir cotação')", loc == "sem botão" and "Pedir cotação" in cs.get(BASE + "/products/lenovo-thinkpad-t14-gen-2").text)
bad = {"variantId": lenovo, "quantity": 1}
html = cs.get(BASE + "/products/dell-latitude-5420").text
aid = re.search(r'name="(\$ACTION_ID_[0-9a-f]+)"', html.split('name="quantity"')[0].rsplit("<form", 1)[1]).group(1)
r = cs.post(BASE + "/products/dell-latitude-5420", files={aid: (None, ""), "variantId": (None, lenovo), "quantity": (None, "1")}, headers={"Origin": BASE}, allow_redirects=False)
check("servidor recusa adicionar variante sem preço (adulteração do formulário)", "error=" in urllib.parse.unquote(r.headers.get("location", "")) and lenovo not in [l["v"] for l in cart_json(cs)])
r = cs.post(BASE + "/products/dell-latitude-5420", files={aid: (None, ""), "variantId": (None, "00000000-0000-0000-0000-000000000000"), "quantity": (None, "1")}, headers={"Origin": BASE}, allow_redirects=False)
check("servidor recusa variante inexistente", "error=" in urllib.parse.unquote(r.headers.get("location", "")))

co = cs.get(BASE + "/checkout")
check("checkout do carrinho mostra itens e 'Alterar no carrinho'", co.status_code == 200 and "Dell Latitude 5420" in co.text and "Alterar no carrinho" in co.text)

evil = LocalSession(); evil.cookies.set("cart", "lixo{{{", domain="localhost.local", path="/")
check("cookie de carrinho adulterado = carrinho vazio (sem erro)", evil.get(BASE + "/cart").status_code == 200 and "O carrinho está vazio" in evil.get(BASE + "/cart").text)

# --- AO: Dell tem preço, HP não → aviso e sem botão de checkout
ao = LocalSession(); ao.cookies.set("country", "AO", domain="localhost.local", path="/"); ao.cookies.set("cart", urllib.parse.quote(json.dumps([{"v": vid, "q": 1}, {"v": hp, "q": 1}])), domain="localhost.local", path="/")
pao = re.sub(r"<!--.*?-->", "", ao.get(BASE + "/cart").text)  # o React separa nós de texto com comentários
check("AO: carrinho avisa que HP não tem preço e bloqueia o checkout", "Sem preço para Angola" in pao and "Continuar para a encomenda" not in pao)
ncust = len(rest("customers?select=id"))
cust = {"name": "Cart Tester", "email": "cart@example.com", "phone": "+351900000002", "country": "AO", "city": "Luanda", "address": "Rua C"}
r = requests.post(BASE + "/api/orders", headers={"X-Real-IP": "10.1.1.1"}, json={"items": [{"variantId": vid, "quantity": 1}, {"variantId": hp, "quantity": 1}], "destination": "AO", "fromCart": True, "customer": cust})
check("API: carrinho com item sem preço no destino = 422 e sem lixo na BD", r.status_code == 422 and len(rest("customers?select=id")) == ncust, r.text[:80])

# --- Encomenda do carrinho (PT)
n0 = order_count()
custpt = {**cust, "country": "PT", "city": "Porto", "postalCode": "4000-001", "email": "cart-pt@example.com"}
r = cs.post(BASE + "/api/orders", headers={"X-Real-IP": "10.1.1.2"}, json={"items": [{"variantId": vid, "quantity": 2}, {"variantId": hp, "quantity": 1}], "destination": "PT", "fromCart": True, "customer": custpt})
check("encomenda do carrinho criada (201)", r.status_code == 201 and r.json()["kind"] == "order", r.text[:80])
oid = r.json()["id"]
o = rest(f"orders?id=eq.{oid}&select=total,subtotal,margin,status,order_items(quantity,unit_price,product_variant_id)")[0]
check("total = 2×500 + 1×300 = 1300 €", o["total"] == 130000 and o["subtotal"] == 130000, str(o))
check("2 linhas de encomenda com preços da BD", sorted((i["quantity"], i["unit_price"]) for i in o["order_items"]) == [(1, 30000), (2, 50000)], str(o["order_items"]))
check("margem = só onde há custo de fornecedor (2×(500−400) = 200 €)", o["margin"] == 20000, str(o["margin"]))
check("carrinho esvaziado após a encomenda (cookie removido)", cs.cookies.get("cart") in (None, "") and "O carrinho está vazio" in cs.get(BASE + "/cart").text)

# --- Itens repetidos são fundidos; preço enviado pelo cliente é ignorado
r = requests.post(BASE + "/api/orders", headers={"X-Real-IP": "10.1.1.3"}, json={"items": [{"variantId": vid, "quantity": 1, "unitPrice": 1}, {"variantId": vid, "quantity": 2}], "destination": "PT", "customer": {**custpt, "email": "dup@example.com"}})
oid2 = r.json().get("id")
items2 = rest(f"order_items?order_id=eq.{oid2}&select=quantity,unit_price")
check("linhas repetidas fundidas (1 linha, ×3, 500 €)", r.status_code == 201 and items2 == [{"quantity": 3, "unit_price": 50000}], str(items2))
r = requests.post(BASE + "/api/orders", headers={"X-Real-IP": "10.1.1.4"}, json={"items": [], "destination": "PT", "customer": custpt})
check("encomenda sem itens = 400", r.status_code == 400)
r = requests.post(BASE + "/api/orders", headers={"X-Real-IP": "10.1.1.5"}, json={"items": [{"variantId": vid, "quantity": 1}, {"variantId": "00000000-0000-0000-0000-000000000000", "quantity": 1}], "destination": "PT", "customer": custpt})
check("um item inexistente invalida a encomenda (404, nada criado)", r.status_code == 404 and order_count() == n0 + 2)
r = requests.post(BASE + "/api/ai/search", json={"text": "portátil até 600€, 16GB RAM e 512GB"}).json()
check("pesquisa NL com dados reais (preço aplicado)", "maxPrice=600" in r["url"] and "ram=16+GB" in r["url"], r["url"])
print(f"\n{len(fails)} falhas" if fails else "\nTodos os testes e2e públicos passaram"); sys.exit(1 if fails else 0)
