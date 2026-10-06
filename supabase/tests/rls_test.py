"""Valida migrações + RLS num Postgres real (pgserver). Uso: python3 supabase/tests/rls_test.py"""
import pathlib, sys, tempfile, uuid
import pgserver, psycopg2

root = pathlib.Path(__file__).resolve().parents[1]
db = pgserver.get_server(tempfile.mkdtemp())
uri = db.get_uri()
conn = psycopg2.connect(uri); conn.autocommit = True
cur = conn.cursor()

def run_file(p):
    cur.execute(pathlib.Path(p).read_text())

run_file(root / "tests/stub_supabase.sql")
for f in sorted((root / "migrations").glob("*.sql")): run_file(f); print("OK migração", f.name)
run_file(root / "seed.sql"); print("OK seed")

admin, staff_user, plain = (str(uuid.uuid4()) for _ in range(3))
for u in (admin, staff_user, plain): cur.execute("insert into auth.users(id,email) values (%s,%s)", (u, f"{u}@x.com"))
cur.execute("insert into profiles(id, role) values (%s,'admin'),(%s,'staff'),(%s,'customer')", (admin, staff_user, plain))
cur.execute("insert into suppliers(name) values ('Fornecedor X') returning id"); sid = cur.fetchone()[0]
cur.execute("select id from product_variants limit 1"); vid = cur.fetchone()[0]
cur.execute("insert into supplier_listings(supplier_id, product_variant_id, supplier_price) values (%s,%s,12345)", (sid, vid))
cur.execute("insert into payment_events(id, provider, type) values ('evt_1','stripe','checkout.session.completed')")
cur.execute("insert into customers(name,email,phone,country,city) values ('Ana','a@x.com','+351912345678','PT','Porto')")
cur.execute("insert into products(name,slug,brand,model,category,condition,status) values ('Rascunho','rascunho','X','Y','laptops','good','draft')")

fails = []
def as_role(role, sub=None):
    cur.execute("reset role"); cur.execute("select set_config('request.jwt.claim.sub', %s, false)", (sub or "",)); cur.execute(f"set role {role}")

def check(name, ok):
    print(("PASS" if ok else "FAIL"), name)
    if not ok: fails.append(name)

def count(sql):
    try: cur.execute(sql); return cur.fetchone()[0]
    except psycopg2.Error as e: return f"ERR:{e.pgcode}"

def denied(sql):
    try: cur.execute(sql); return False
    except psycopg2.Error as e: return e.pgcode in ("42501",)  # insufficient_privilege / RLS

# --- anónimo
as_role("anon")
check("anon vê só produtos ativos (8 demo, sem rascunho)", count("select count(*) from products") == 8)
check("anon vê variantes de produtos ativos", count("select count(*) from product_variants") == 8)
check("anon NÃO vê supplier_listings", count("select count(*) from supplier_listings") == 0)
check("anon NÃO vê clientes", count("select count(*) from customers") == 0)
check("anon NÃO vê fornecedores/encomendas/cotações/pedidos",
      all(count(f"select count(*) from {t}") == 0 for t in ("suppliers", "orders", "quotes", "custom_requests", "order_items")))
check("anon não pode inserir cliente", denied("insert into customers(name,email,phone,country,city) values ('x','x@x.com','123','PT','x')"))
check("anon não pode alterar produtos", count("with u as (update products set name='hack' returning 1) select count(*) from u") == 0)
check("anon não pode apagar produtos", count("with d as (delete from products returning 1) select count(*) from d") == 0)
check("anon NÃO lê payment_events", count("select count(*) from payment_events") == 0)
check("anon NÃO escreve payment_events", denied("insert into payment_events(id,provider,type) values ('evt_x','stripe','t')"))
check("anon não lê profiles", count("select count(*) from profiles") == 0)

# --- utilizador autenticado sem role staff
as_role("authenticated", plain)
check("cliente autenticado NÃO vê supplier_listings", count("select count(*) from supplier_listings") == 0)
check("cliente autenticado NÃO vê clientes", count("select count(*) from customers") == 0)
check("cliente autenticado só vê o próprio profile", count("select count(*) from profiles") == 1)
check("cliente autenticado NÃO se promove a admin", count("with u as (update profiles set role='admin' where id='%s' returning 1) select count(*) from u" % plain) == 0)
check("cliente autenticado não insere profile (sem policy de escrita)", denied("insert into profiles(id, role) values (gen_random_uuid(),'admin')"))

# --- staff
as_role("authenticated", staff_user)
check("staff vê rascunhos (9 produtos)", count("select count(*) from products") == 9)
check("staff vê supplier_listings", count("select count(*) from supplier_listings") == 1)
check("staff vê clientes", count("select count(*) from customers") == 1)
check("staff lê payment_events", count("select count(*) from payment_events") == 1)
check("staff NÃO escreve payment_events (só service role)", denied("insert into payment_events(id,provider,type) values ('evt_y','stripe','t')"))
check("staff pode alterar produto", count("with u as (update products set description='ok' where slug='rascunho' returning 1) select count(*) from u") == 1)

# --- constraints
cur.execute("reset role")
try: cur.execute("update product_variants set selling_price_pt = -5"); neg_ok = False
except psycopg2.Error as e: neg_ok = e.pgcode == "23514"
check("CHECK constraint (23514) rejeita preço negativo", neg_ok)
try: cur.execute("insert into products(name,slug,brand,model,category,condition) values ('d','dell-latitude-5420','a','b','laptops','good')"); dup = False
except psycopg2.Error as e: dup = e.pgcode == "23505"
check("slug único (23505)", dup)
cur.execute("insert into customers(name,email,phone,country,city) values ('B','b@x.com','1','AO','Luanda') returning id"); cid = cur.fetchone()[0]
cur.execute("insert into orders(customer_id,destination,total) values (%s,'AO',100) returning id", (cid,)); oid = cur.fetchone()[0]
cur.execute("insert into order_items(order_id, product_variant_id, quantity, unit_price) values (%s,%s,1,100)", (oid, vid))
try: cur.execute("delete from product_variants where id=%s", (vid,)); fk = False
except psycopg2.Error as e: fk = e.pgcode == "23503"
check("FK impede apagar variante com encomendas (23503)", fk)

print(f"\n{len(fails)} falhas" if fails else "\nTodos os testes passaram")
db.cleanup()
sys.exit(1 if fails else 0)
