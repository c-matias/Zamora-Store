import { createHmac, timingSafeEqual } from "node:crypto";

/** Assinatura HMAC-SHA256 de `${timestamp}.${body}` (hex). Partilhada entre eventos de saída e endpoints de entrada (n8n). */
export function sign(secret: string, timestamp: string, body: string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function verifySignature(opts: { secret: string; timestamp: string; body: string; signature: string; now?: number; toleranceMs?: number }): boolean {
  const { secret, timestamp, body, signature, now = Date.now(), toleranceMs = 5 * 60_000 } = opts;
  if (!secret || !/^\d{10,16}$/.test(timestamp)) return false;
  if (Math.abs(now - Number(timestamp)) > toleranceMs) return false; // anti-replay
  const expected = Buffer.from(sign(secret, timestamp, body), "hex");
  let given: Buffer;
  try { given = Buffer.from(signature, "hex"); } catch { return false; }
  return given.length === expected.length && timingSafeEqual(given, expected);
}
