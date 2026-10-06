import "server-only";

/**
 * Abstração de LLM. Opcional: sem ANTHROPIC_API_KEY, todas as funcionalidades usam o fallback determinístico.
 * Os LLMs só produzem SUGESTÕES (filtros, rascunhos); nenhum código aqui compra, confirma stock ou altera encomendas.
 */
export interface LlmProvider {
  name: string;
  complete(args: { system: string; user: string; maxTokens: number }): Promise<string>;
}

class AnthropicProvider implements LlmProvider {
  name = "anthropic";
  constructor(private apiKey: string, private model: string) {}
  async complete({ system, user, maxTokens }: { system: string; user: string; maxTokens: number }): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": this.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: this.model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    return (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  }
}

export function getProvider(): LlmProvider | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new AnthropicProvider(key, process.env.AI_MODEL ?? "claude-haiku-4-5-20251001");
}
