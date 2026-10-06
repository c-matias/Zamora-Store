import type { Cents } from "@/types/domain";

export interface OrderRow { status: string; payment_status: string; total: Cents; margin: Cents }
export interface QuoteRow { status: string }

const PROCESSING = ["confirmed", "supplier_order", "received", "quality_check", "ready_to_ship", "shipped"];

export function summarize(orders: OrderRow[], quotes: QuoteRow[]) {
  const live = orders.filter((o) => o.status !== "cancelled");
  return {
    pendingOrders: orders.filter((o) => o.status === "pending" || o.status === "quote").length,
    processingOrders: orders.filter((o) => PROCESSING.includes(o.status)).length,
    completedOrders: orders.filter((o) => o.status === "delivered").length,
    pendingQuotes: quotes.filter((q) => q.status === "draft" || q.status === "sent").length,
    /** Receita = encomendas com pagamento marcado como pago (sem integração de pagamentos ainda). */
    revenue: live.filter((o) => o.payment_status === "paid").reduce((s, o) => s + o.total, 0),
    /** Margem estimada de todas as encomendas não canceladas (usa custo de fornecedor conhecido). */
    estimatedMargin: live.reduce((s, o) => s + o.margin, 0),
  };
}
