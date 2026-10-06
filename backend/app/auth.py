import jwt
import httpx
from fastapi import Depends, HTTPException, Request
from .config import Settings, get_settings

_jwks_clients: dict[str, jwt.PyJWKClient] = {}


def _decode(token: str, s: Settings) -> dict:
    """Valida o JWT do Supabase (assinatura, expiração, audience)."""
    try:
        header = jwt.get_unverified_header(token)
        if header.get("alg") == "HS256":
            if not s.supabase_jwt_secret:
                raise HTTPException(503, "Autenticação não configurada")
            return jwt.decode(token, s.supabase_jwt_secret, algorithms=["HS256"], audience="authenticated")
        if not s.supabase_url:
            raise HTTPException(503, "Autenticação não configurada")
        url = f"{s.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
        client = _jwks_clients.setdefault(url, jwt.PyJWKClient(url, cache_keys=True))
        key = client.get_signing_key_from_jwt(token).key
        return jwt.decode(token, key, algorithms=["RS256", "ES256"], audience="authenticated")
    except HTTPException:
        raise
    except jwt.PyJWTError:
        raise HTTPException(401, "Token inválido")


def current_user(request: Request, s: Settings = Depends(get_settings)) -> dict:
    auth = request.headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        raise HTTPException(401, "Token em falta")
    claims = _decode(auth[7:].strip(), s)
    claims["_token"] = auth[7:].strip()
    return claims


def fetch_role(user_id: str, token: str, s: Settings) -> str | None:
    """Lê o role em `profiles` com o token do próprio utilizador (a RLS só lhe permite ver o seu)."""
    r = httpx.get(
        f"{s.supabase_url.rstrip('/')}/rest/v1/profiles",
        params={"select": "role", "id": f"eq.{user_id}"},
        headers={"apikey": s.supabase_anon_key, "Authorization": f"Bearer {token}"},
        timeout=5,
    )
    r.raise_for_status()
    rows = r.json()
    return rows[0]["role"] if rows else None


def require_staff(user: dict = Depends(current_user), s: Settings = Depends(get_settings)) -> dict:
    try:
        role = fetch_role(user["sub"], user["_token"], s)
    except httpx.HTTPError:
        raise HTTPException(503, "Não foi possível verificar permissões")
    if role not in ("admin", "staff"):
        raise HTTPException(403, "Sem permissões")
    user["app_role"] = role
    return user
