import "server-only";
import { sign } from "@/lib/signature";

export const EVENT_NAMES = [
  "order.created",
  "quote.created",
  "quote.accepted",
  "payment.confirmed",
  "supplier.order.created",
  "product.received",
  "quality_check.completed",
  "shipment.created",
  "shipment.delivered",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export interface AutomationEvent<T = Record<string, unknown>> {
  name: EventName;
  occurredAt: string;
  payload: T;
}

/**
 * Emite evento para automações (n8n). Nunca bloqueia nem falha o fluxo principal.
 * Se N8N_WEBHOOK_URL não estiver definido, é um no-op.
 */
export async function emitEvent<T extends Record<string, unknown>>(name: EventName, payload: T): Promise<void> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return;
  const event: AutomationEvent<T> = { name, occurredAt: new Date().toISOString(), payload };
  const body = JSON.stringify(event);
  const secret = process.env.N8N_WEBHOOK_SECRET ?? "";
  const timestamp = String(Date.now());
  const signature = sign(secret, timestamp, body);
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Timestamp": timestamp, "X-Signature": signature },
      body,
      signal: AbortSignal.timeout(5000),
    });
  } catch (err) {
    console.error(`[events] falha ao emitir ${name}`, err);
  }
}
