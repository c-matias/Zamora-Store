"""Sobe um stack local equivalente ao Supabase (Postgres + PostgREST + proxy /rest/v1) com migrações e seed.
Escreve /tmp/e2e.env com URL e chaves. Uso: python3 supabase/tests/e2e_stack.py &   (PostgREST: /tmp/pgrst/postgrest)"""
import http.client, http.server, os, pathlib, socketserver, subprocess, tempfile, threading, time, uuid
import jwt, pgserver, psycopg2

root = pathlib.Path(__file__).resolve().parents[1]
SECRET = "e2e-jwt-secret-0123456789-abcdefghijklmnop"
db = pgserver.get_server(tempfile.mkdtemp()); uri = db.get_uri()
conn = psycopg2.connect(uri); conn.autocommit = True; cur = conn.cursor()
for f in [root / "tests/stub_supabase.sql", *sorted((root / "migrations").glob("*.sql")), root / "seed.sql"]:
    cur.execute(f.read_text())
cur.execute("create role authenticator login noinherit; grant anon, authenticated, service_role to authenticator;")
staff = str(uuid.uuid4()); plain = str(uuid.uuid4())
for u, r in ((staff, "admin"), (plain, "customer")):
    cur.execute("insert into auth.users(id,email) values (%s,%s)", (u, f"{u[:6]}@x.com")); cur.execute("insert into profiles(id,role) values (%s,%s)", (u, r))
cur.execute("insert into suppliers(name,website,country) values ('Fornecedor X','https://x.example','DE') returning id"); sid = cur.fetchone()[0]
cur.execute("select id from product_variants where product_id=(select id from products where slug='dell-latitude-5420')"); vid = cur.fetchone()[0]
cur.execute("insert into supplier_listings(supplier_id, product_variant_id, supplier_price, availability) values (%s,%s,40000,'available')", (sid, vid))
cur.execute("update product_variants set selling_price_pt=50000, selling_price_ao=55000 where id=%s", (vid,))
# 2.º produto com preço só em PT (para testar carrinho com itens sem preço em AO). Feito aqui porque o catálogo tem cache de 60 s.
cur.execute("update product_variants set selling_price_pt=30000, selling_price_ao=null where product_id=(select id from products where slug='hp-elitebook-840-g8')")

env = {**os.environ, "PGRST_DB_URI": uri.replace("postgres:@", "authenticator:@") if "postgres:@" in uri else uri,
       "PGRST_DB_SCHEMAS": "public", "PGRST_DB_ANON_ROLE": "anon", "PGRST_JWT_SECRET": SECRET, "PGRST_SERVER_PORT": "3100"}
subprocess.Popen(["/tmp/pgrst/postgrest"], env=env, stdout=open("/tmp/pgrst.log", "w"), stderr=subprocess.STDOUT)

class Proxy(http.server.BaseHTTPRequestHandler):
    def _fwd(self):
        if self.path.startswith("/auth/v1/user"):  # stub mínimo do GoTrue: devolve o utilizador do JWT (só para testes)
            import json
            claims = jwt.decode(self.headers.get("Authorization", "")[7:], options={"verify_signature": False})
            data = json.dumps({"id": claims.get("sub"), "aud": "authenticated", "role": "authenticated", "email": f"{str(claims.get('sub'))[:6]}@x.com",
                               "app_metadata": {}, "user_metadata": {}, "created_at": "2026-01-01T00:00:00Z"}).encode()
            self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(data))); self.end_headers(); self.wfile.write(data); return
        n = int(self.headers.get("Content-Length") or 0); body = self.rfile.read(n) if n else None
        c = http.client.HTTPConnection("127.0.0.1", 3100, timeout=20)
        headers = {k: v for k, v in self.headers.items() if k.lower() not in ("host", "connection")}
        c.request(self.command, self.path.replace("/rest/v1", "", 1), body, headers); r = c.getresponse(); data = r.read()
        self.send_response(r.status)
        for k, v in r.getheaders():
            if k.lower() not in ("transfer-encoding", "connection", "content-length"): self.send_header(k, v)
        self.send_header("Content-Length", str(len(data))); self.end_headers(); self.wfile.write(data)
    do_GET = do_POST = do_PATCH = do_DELETE = do_PUT = do_HEAD = _fwd
    def log_message(self, *a): pass
class S(socketserver.ThreadingMixIn, http.server.HTTPServer): daemon_threads = True

tok = lambda **c: jwt.encode({"aud": "authenticated", "exp": int(time.time()) + 36000, **c}, SECRET, algorithm="HS256")
pathlib.Path("/tmp/e2e.env").write_text("\n".join([
    "URL=http://127.0.0.1:3101", f"ANON={tok(role='anon')}", f"SERVICE={tok(role='service_role')}",
    f"STAFF={tok(role='authenticated', sub=staff)}", f"STAFF_ID={staff}", f"PLAIN={tok(role='authenticated', sub=plain)}", f"VARIANT={vid}", ""]))
print("pronto", flush=True)
S(("127.0.0.1", 3101), Proxy).serve_forever()
