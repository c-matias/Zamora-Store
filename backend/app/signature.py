"""Assinatura HMAC-SHA256 de `{timestamp}.{corpo}` — compatível com src/lib/signature.ts (Next.js)."""
import hashlib
import hmac
import time


def sign(secret: str, timestamp: str, body: bytes) -> str:
    return hmac.new(secret.encode(), timestamp.encode() + b"." + body, hashlib.sha256).hexdigest()


def verify(secret: str, timestamp: str, body: bytes, signature: str, now_ms: int | None = None, tolerance_ms: int = 300_000) -> bool:
    if not secret or not timestamp.isdigit() or not (10 <= len(timestamp) <= 16):
        return False
    now = now_ms if now_ms is not None else int(time.time() * 1000)
    if abs(now - int(timestamp)) > tolerance_ms:  # anti-replay
        return False
    return hmac.compare_digest(sign(secret, timestamp, body), signature.lower())
