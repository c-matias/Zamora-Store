/**
 * Limitador de pedidos (janela fixa).
 * - Com UPSTASH_REDIS_REST_URL/TOKEN: contador partilhado entre instâncias (Redis via REST).
 * - Sem eles (ou se o Redis falhar): contador em memória por instância (melhor do que nada).
 * Só deve ser importado em código de servidor (usa segredos de ambiente).
 */
const mem = new Map<string, number[]>();

function memoryLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (mem.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { mem.set(key, recent); return false; }
  recent.push(now);
  mem.set(key, recent);
  if (mem.size > 5000) mem.clear();
  return true;
}

async function redisLimit(url: string, token: string, key: string, max: number, windowMs: number): Promise<boolean> {
  const bucket = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;
  const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([["INCR", bucket], ["PEXPIRE", bucket, String(windowMs), "NX"]]),
    signal: AbortSignal.timeout(1500),
  });
  if (!res.ok) throw new Error(`redis HTTP ${res.status}`);
  const data = (await res.json()) as { result?: number }[];
  const count = data[0]?.result;
  if (typeof count !== "number") throw new Error("redis: resposta inesperada");
  return count <= max;
}

export async function rateLimit(key: string, max = 5, windowMs = 10 * 60_000): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try { return await redisLimit(url, token, key, max, windowMs); }
    catch (e) { console.error("[rate-limit] Redis indisponível, a usar memória", e); }
  }
  return memoryLimit(key, max, windowMs);
}

/**
 * Chave por IP. Atrás da Vercel os cabeçalhos são definidos pela plataforma; fora de um proxy de confiança
 * o cliente pode falsificá-los (nesse caso, limitar também no proxy/WAF).
 */
export function clientKey(req: Request, scope: string): string {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return `${scope}:${ip}`;
}
