import time
import jwt
import pytest
from fastapi.testclient import TestClient
from app import auth
from app.config import Settings, get_settings
from app.main import app
from app.signature import sign, verify

SECRET = "jwt-secret-for-tests-0123456789abcdef"
WH = "s3cret"
app.dependency_overrides[get_settings] = lambda: Settings(supabase_url="https://x.supabase.co", supabase_anon_key="anon", supabase_jwt_secret=SECRET, n8n_webhook_secret=WH)
client = TestClient(app)


def token(**over):
    claims = {"sub": "user-1", "aud": "authenticated", "email": "a@x.com", "exp": int(time.time()) + 600, **over}
    return jwt.encode(claims, SECRET, algorithm="HS256")


def test_signature_parity_with_nextjs():
    # Vetor gerado pelo Node (src/lib/signature.ts): sign("s3cret","1700000000000",'{"a":1}')
    assert sign("s3cret", "1700000000000", b'{"a":1}') == "8a6f992378d0d47b6fcdf1cc8d72e46ba5c789b2c9d3a538be31fe07d598ba6d"


def test_signature_rejects_replay_tamper_and_empty_secret():
    ts = str(int(time.time() * 1000))
    sig = sign(WH, ts, b"x")
    assert verify(WH, ts, b"x", sig)
    assert not verify(WH, ts, b"y", sig)
    assert not verify("", ts, b"x", sig)
    assert not verify(WH, ts, b"x", sig, now_ms=int(ts) + 600_000)


def test_health_is_public():
    assert client.get("/health").json() == {"status": "ok"}


def test_me_requires_valid_token():
    assert client.get("/v1/me").status_code == 401
    assert client.get("/v1/me", headers={"Authorization": "Bearer lixo"}).status_code == 401
    assert client.get("/v1/me", headers={"Authorization": f"Bearer {token(exp=1)}"}).status_code == 401
    assert client.get("/v1/me", headers={"Authorization": f"Bearer {token(aud='outro')}"}).status_code == 401
    r = client.get("/v1/me", headers={"Authorization": f"Bearer {token()}"})
    assert r.status_code == 200 and r.json()["id"] == "user-1"


def test_alg_none_is_rejected():
    forged = jwt.encode({"sub": "u", "aud": "authenticated"}, key="", algorithm="none")
    assert client.get("/v1/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


@pytest.mark.parametrize("role,status", [("admin", 200), ("staff", 200), ("customer", 403), (None, 403)])
def test_staff_only(monkeypatch, role, status):
    monkeypatch.setattr(auth, "fetch_role", lambda uid, tok, s: role)
    assert client.get("/v1/staff/ping", headers={"Authorization": f"Bearer {token()}"}).status_code == status


def test_events_requires_signature():
    body = b'{"name":"order.created"}'
    ts = str(int(time.time() * 1000))
    assert client.post("/v1/events", content=body).status_code == 401
    assert client.post("/v1/events", content=body, headers={"x-timestamp": ts, "x-signature": "00"}).status_code == 401
    ok = client.post("/v1/events", content=body, headers={"x-timestamp": ts, "x-signature": sign(WH, ts, body)})
    assert ok.status_code == 200
