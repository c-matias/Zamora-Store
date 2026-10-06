"""Testa as server actions do admin contra o stack local (e2e_stack.py + next start em :3071), sem JavaScript.
Uso: python3 supabase/tests/e2e_admin.py   (lê /tmp/e2e.env, /tmp/ids.txt, /tmp/cs.txt)"""
import re, sys, requests, urllib.parse

BASE = "http://localhost:3071"
env = dict(l.split("=", 1) for l in open("/tmp/e2e.env").read().split("\n") if "=" in l)
ORDER, QUOTE, PROD, _ = open("/tmp/ids.txt").read().split()
COOKIE = open("/tmp/cs.txt").read().strip()
H = {"Cookie": COOKIE, "Origin": BASE}
fails = []

def rest(path):
    return requests.get(f"{env['URL']}/rest/v1/{path}", headers={"apikey": env["SERVICE"], "Authorization": f"Bearer {env['SERVICE']}"}).json()

def action_ids(page):
    html = requests.get(BASE + page, headers=H).text
    # o 1.º formulário do layout é o "Terminar sessão": ignorar
    return re.findall(r'name="(\$ACTION_ID_[0-9a-f]+)"', html)[1:]

def post(page, idx, fields):
    ids = action_ids(page)
    data = {ids[idx]: (None, "")}; data.update({k: (None, str(v)) for k, v in fields.items()})
    r = requests.post(BASE + page, headers=H, files=data, allow_redirects=False)
    return r.status_code, urllib.parse.unquote(r.headers.get("location", ""))

def post_form(page, must_have, fields, must_not=()):
    """Localiza a server action pelo conteúdo do formulário (campos que contém / não contém) e submete."""
    html = requests.get(BASE + page, headers=H).text
    for block in html.split("<form")[1:]:
        m = re.search(r'name="(\$ACTION_ID_[0-9a-f]+)"', block)
        if m and all(f'name="{x}"' in block for x in must_have) and not any(f'name="{x}"' in block for x in must_not):
            data = {m.group(1): (None, "")}; data.update({k: (None, str(v)) for k, v in fields.items()})
            r = requests.post(BASE + page, headers=H, files=data, allow_redirects=False)
            return r.status_code, urllib.parse.unquote(r.headers.get("location", ""))
    raise AssertionError(f"formulário não encontrado em {page}: {must_have}")

def check(name, ok, extra=""):
    print(("PASS" if ok else "FAIL"), name, extra)
    if not ok: fails.append(name)

# --- Pedido: transições
st = lambda: rest(f"orders?id=eq.{ORDER}&select=status,payment_status,shipping_status")[0]
common = {"id": ORDER, "paymentStatus": "to_confirm", "shippingStatus": "not_shipped", "notes": "nota teste"}
code, loc = post(f"/admin/orders/{ORDER}", 0, {**common, "status": "supplier_order"})
check("transição inválida pending→supplier_order é recusada", "error=" in loc and st()["status"] == "pending", loc[-70:])
code, loc = post(f"/admin/orders/{ORDER}", 0, {**common, "status": "confirmed"})
check("pending→confirmed aceite", "saved=1" in loc and st()["status"] == "confirmed", loc[-40:])
code, loc = post(f"/admin/orders/{ORDER}", 0, {**common, "status": "supplier_order"})
check("confirmed→supplier_order (ação humana) aceite", st()["status"] == "supplier_order")
code, loc = post(f"/admin/orders/{ORDER}", 0, {**common, "status": "supplier_order", "paymentStatus": "paid"})
check("pagamento marcado como pago", st()["payment_status"] == "paid")

code, loc = post(f"/admin/orders/{ORDER}", 0, {**common, "status": "received", "paymentStatus": "paid"})
ship = requests.get(BASE + "/admin/shipping", headers=H).text
check("encomenda recebida aparece na página de envios", st()["status"] == "received" and ORDER[:8].upper() in ship)
code, loc = post(f"/admin/orders/{ORDER}", 0, {**common, "status": "delivered", "paymentStatus": "paid"})
check("received→delivered (salto) é recusado", "error=" in loc and st()["status"] == "received")

# --- Pagamento sem fornecedor configurado: erro claro (encomenda ainda não está 'confirmed')
code, loc = post(f"/admin/orders/{ORDER}", 0, {**common, "status": "supplier_order"})

# --- Cotação: guardar custos → enviar → aceitar → converter
q = lambda: rest(f"quotes?id=eq.{QUOTE}&select=status,supplier_cost,shipping_cost,taxes_and_fees,payment_fees,margin,final_price")[0]
code, loc = post(f"/admin/quotes/{QUOTE}", 0, {"id": QUOTE, "supplierCost": "400,00", "shippingCost": "90", "taxesAndFees": "0", "paymentFees": "9.50", "targetMargin": "20", "finalPrice": "", "notes": "teste"})
cq = q()
# custo total = 400+90+9,5 = 499,5 → preço p/ margem 20% = 499,5/0,8 = 624,375 → 624,38 → 62438 cêntimos
check("cotação: preço final por margem alvo (62438)", cq["final_price"] == 62438, str(cq))
check("cotação: margem = preço − custos (12488)", cq["margin"] == 62438 - 49950, str(cq["margin"]))
code, loc = post(f"/admin/quotes/{QUOTE}", 1, {"id": QUOTE, "action": "send"})
check("cotação enviada", q()["status"] == "sent")
code, loc = post(f"/admin/quotes/{QUOTE}", 1, {"id": QUOTE, "action": "accept"})
check("cotação aceite", q()["status"] == "accepted")
code, loc = post(f"/admin/quotes/{QUOTE}", 1, {"id": QUOTE, "action": "convert"})
conv = rest(f"orders?select=id,status,subtotal,shipping,total,margin,destination,order_items(quantity,unit_price)&total=eq.62438")
check("converter cotação aceite cria encomenda confirmada com valores corretos",
      len(conv) == 1 and conv[0]["status"] == "confirmed" and conv[0]["shipping"] == 9000 and conv[0]["subtotal"] == 53438
      and conv[0]["margin"] == 12488 and conv[0]["order_items"][0]["unit_price"] == 62438 and q()["status"] == "converted", str(conv)[:160])
check("cotação convertida deixa de mostrar ações (não converte duas vezes)", len(action_ids(f"/admin/quotes/{QUOTE}")) == 1 and len(rest("orders?select=id&total=eq.62438")) == 1)

# cotação criada no admin SEM produto: não pode ser convertida
cust = rest("customers?select=id&limit=1")[0]["id"]
code, loc = post("/admin/quotes/new", 0, {"customerId": cust, "productId": "", "destination": "PT"})
nq = loc.rsplit("/", 1)[-1]
check("cotação manual criada (rascunho)", re.fullmatch(r"[0-9a-f-]{36}", nq) is not None, loc[-50:])
post(f"/admin/quotes/{nq}", 0, {"id": nq, "supplierCost": "100", "shippingCost": "0", "taxesAndFees": "0", "paymentFees": "0", "targetMargin": "", "finalPrice": "150", "notes": ""})
for act in ("send", "accept"): post(f"/admin/quotes/{nq}", 1, {"id": nq, "action": act})
code, loc = post(f"/admin/quotes/{nq}", 1, {"id": nq, "action": "convert"})
check("converter cotação sem produto é recusado", "error=" in loc and rest(f"quotes?id=eq.{nq}&select=status")[0]["status"] == "accepted", loc[-80:])
code, loc = post(f"/admin/quotes/{nq}", 1, {"id": nq, "action": "send"})
check("não reenvia cotação já aceite", "error=" in loc)

# --- Produto: criar com preços e fornecedor
sid = rest("suppliers?select=id")[0]["id"]
code, loc = post("/admin/products/new", 0, {"name": "Teste Notebook X", "slug": "", "brand": "Acme", "model": "X1", "category": "laptops", "condition": "good", "status": "active",
    "description": "d", "images": "", "cpu": "i5", "ram": "16 GB", "storage": "512 GB SSD", "os": "Windows 11 Pro", "color": "", "pricePT": "450,00", "priceAO": "",
    "supplierId": sid, "availability": "available", "supplierPrice": "300", "supplierUrl": "https://f.example/x1"})
p = rest("products?slug=eq.teste-notebook-x&select=id,status,product_variants(os,selling_price_pt,selling_price_ao,supplier_listings:id)")
check("produto criado com slug gerado e preço PT", len(p) == 1 and p[0]["product_variants"][0]["selling_price_pt"] == 45000, str(p)[:120])
lst = rest("supplier_listings?select=supplier_price,availability&supplier_price=eq.30000")
check("listagem de fornecedor criada (custo 30000)", len(lst) == 1 and lst[0]["availability"] == "available")
# --- Variantes
PID = p[0]["id"]; pg = f"/admin/products/{PID}"
vcount = lambda: rest(f"product_variants?product_id=eq.{PID}&select=id,ram,selling_price_pt&order=created_at.asc")
code, loc = post_form(pg, ["id", "name", "brand"], {"id": PID, "name": "Teste Notebook X", "slug": "teste-notebook-x", "brand": "Acme", "model": "X1", "category": "laptops", "condition": "good", "status": "active", "description": "editado", "images": ""})
check("editar o produto NÃO cria variantes novas", len(vcount()) == 1, loc[-40:])
code, loc = post_form(pg, ["productId", "ram", "pricePT"], {"productId": PID, "cpu": "i5", "ram": "32 GB", "storage": "1 TB SSD", "os": "Windows 11 Pro", "color": "", "variantCondition": "very_good",
    "pricePT": "600", "priceAO": "", "supplierId": sid, "availability": "available", "supplierPrice": "420", "supplierUrl": ""}, must_not=["variantId"])
vs = vcount(); check("2.ª variante adicionada (600 €)", len(vs) == 2 and vs[1]["selling_price_pt"] == 60000, str(vs))
V1, V2 = vs[0]["id"], vs[1]["id"]
code, loc = post_form(pg, ["productId", "variantId", "ram"], {"productId": PID, "variantId": V2, "cpu": "i5", "ram": "32 GB", "storage": "1 TB SSD", "os": "Windows 11 Pro", "color": "", "variantCondition": "very_good",
    "pricePT": "590", "priceAO": "", "supplierId": "", "availability": "unknown", "supplierPrice": "", "supplierUrl": ""})
check("editar variante atualiza o preço (590 €)", rest(f"product_variants?id=eq.{V2}&select=selling_price_pt")[0]["selling_price_pt"] == 59000)
dflt = requests.get(BASE + "/products/teste-notebook-x").text
check("loja: seletor de configurações e preço da 1.ª variante", "Configurações disponíveis" in dflt and "450,00" in dflt)
sel = requests.get(BASE + f"/products/teste-notebook-x?v={V2}").text
check("loja: ?v= mostra o preço da variante escolhida (590 €)", "590,00" in sel and "checkout?product=teste-notebook-x&amp;variant=" + V2 in sel)
listing = requests.get(BASE + "/products").text
check("catálogo: 'desde' + nº de configurações", "desde" in listing and "2 configurações" in listing)
check("checkout por variante mostra a configuração", "32 GB" in requests.get(BASE + f"/checkout?product=teste-notebook-x&variant={V2}").text)
r = requests.post(BASE + "/api/orders", headers={"X-Real-IP": "10.9.9.9"}, json={"variantId": V2, "quantity": 1, "destination": "PT", "customer": {"name": "Var", "email": "v@example.com", "phone": "+351900000001", "country": "PT", "city": "Porto", "address": "R", "postalCode": "4000-001"}})
oi = rest(f"order_items?product_variant_id=eq.{V2}&select=unit_price")
check("encomenda da variante usa o preço dessa variante (590 €)", r.status_code == 201 and oi and oi[0]["unit_price"] == 59000, r.text[:60])
code, loc = post_form(pg, ["productId", "variantId"], {"productId": PID, "variantId": V2}, must_not=["ram"])
check("apagar variante com encomendas é bloqueado", "error=" in loc and "encomendas" in loc and len(vcount()) == 2, loc[-80:])
code, loc = post_form(pg, ["productId", "variantId"], {"productId": PID, "variantId": V1}, must_not=["ram"])
check("apagar variante sem encomendas funciona", len(vcount()) == 1 and vcount()[0]["id"] == V2)
code, loc = post_form(pg, ["productId", "variantId"], {"productId": PID, "variantId": V2}, must_not=["ram"])
check("não deixa o produto sem variantes", "error=" in loc and "pelo menos" in loc and len(vcount()) == 1, loc[-80:])

code, loc = post("/admin/products/new", 0, {"name": "Outro", "slug": "teste-notebook-x", "brand": "A", "model": "B", "category": "laptops", "condition": "good", "status": "draft", "description": "", "images": "", "availability": "unknown"})
check("slug duplicado dá erro amigável", "error=" in loc and "slug" in loc.lower(), loc[-60:])
code, loc = post("/admin/products/new", 0, {"name": "Img", "slug": "", "brand": "A", "model": "B", "category": "laptops", "condition": "good", "status": "draft", "description": "", "images": "javascript:alert(1)", "availability": "unknown"})
check("URL de imagem não-https é recusado", "error=" in loc and not rest("products?slug=eq.img&select=id"), loc[-80:])
code, loc = post("/admin/products/new", 0, {"name": "Neg", "slug": "", "brand": "A", "model": "B", "category": "laptops", "condition": "good", "status": "draft", "description": "", "images": "", "pricePT": "abc", "availability": "unknown"})
check("preço inválido é recusado", "error=" in loc and not rest("products?slug=eq.neg&select=id"), loc[-60:])

# --- Fornecedor
code, loc = post("/admin/suppliers", 0, {"name": "Novo Forn", "website": "https://novo.example", "country": "PT", "notes": ""})
check("fornecedor criado", len(rest("suppliers?name=eq.Novo%20Forn&select=id")) == 1)
code, loc = post("/admin/suppliers", 0, {"name": "Mau", "website": "não-é-url", "country": "", "notes": ""})
check("fornecedor com URL inválido recusado", "error=" in loc)

# --- Apagar produto com encomendas é bloqueado
order_prod = rest(f"products?id=eq.{PROD}&select=id")
code, loc = post("/admin/products", 1, {"id": PROD})
check("apagar produto com encomendas é bloqueado com mensagem", rest(f"products?id=eq.{PROD}&select=id") != [] and "error=" in loc, loc[-90:])

print(f"\n{len(fails)} falhas" if fails else "\nTodos os testes e2e do admin passaram")
sys.exit(1 if fails else 0)
