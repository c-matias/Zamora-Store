from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuração por variáveis de ambiente (nunca no código)."""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_anon_key: str = ""
    # Projetos Supabase antigos usam HS256 com segredo; os novos usam JWKS (chaves assimétricas).
    supabase_jwt_secret: str = ""
    n8n_webhook_secret: str = ""
    allowed_origins: str = ""  # CORS: lista separada por vírgulas (vazio = nenhum)


@lru_cache
def get_settings() -> Settings:
    return Settings()
