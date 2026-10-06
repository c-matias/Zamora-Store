from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from .auth import current_user, require_staff
from .config import Settings, get_settings
from .signature import verify

app = FastAPI(title="Loja recondicionados — backend", version="0.1.0", docs_url=None, redoc_url=None)

_origins = [o.strip() for o in get_settings().allowed_origins.split(",") if o.strip()]
if _origins:
    app.add_middleware(CORSMiddleware, allow_origins=_origins, allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/v1/me")
def me(user: dict = Depends(current_user)) -> dict:
    return {"id": user["sub"], "email": user.get("email")}


@app.get("/v1/staff/ping")
def staff_ping(user: dict = Depends(require_staff)) -> dict:
    return {"ok": True, "role": user["app_role"]}


@app.post("/v1/events")
async def receive_event(request: Request, s: Settings = Depends(get_settings)) -> dict:
    """Receptor de eventos assinados (mesmo formato dos eventos de saída do Next.js).
    Ponto de extensão para workers (scraping de fornecedores, tarefas de IA, etc.).
    NÃO compra a fornecedores: a aprovação humana mantém-se."""
    if not s.n8n_webhook_secret:
        raise HTTPException(503, "Não configurado")
    body = await request.body()
    if not verify(s.n8n_webhook_secret, request.headers.get("x-timestamp", ""), body, request.headers.get("x-signature", "")):
        raise HTTPException(401, "Assinatura inválida")
    return {"received": True}
