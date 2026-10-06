/** Imagens locais ou do Storage do Supabase passam pelo otimizador do Next; outras usam <img> simples. */
export function isOptimizable(src: string): boolean {
  if (src.startsWith("/")) return true;
  const supa = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supa) return false;
  try { return new URL(src).hostname === new URL(supa).hostname; } catch { return false; }
}
