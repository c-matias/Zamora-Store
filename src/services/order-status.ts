import type { OrderStatus } from "@/types/domain";
import type { EventName } from "@/lib/events";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending", quote: "Quote", confirmed: "Confirmed", supplier_order: "Supplier Order",
  received: "Received", quality_check: "Quality Check", ready_to_ship: "Ready to Ship",
  shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
};

/** Transições permitidas. Confirmed -> Supplier Order é sempre uma ação humana explícita. */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: ["quote", "confirmed", "cancelled"],
  quote: ["confirmed", "cancelled"],
  confirmed: ["supplier_order", "cancelled"],
  supplier_order: ["received", "cancelled"],
  received: ["quality_check", "cancelled"],
  quality_check: ["ready_to_ship", "cancelled"],
  ready_to_ship: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const nextStatuses = (from: OrderStatus): OrderStatus[] => NEXT[from];
export const canTransition = (from: OrderStatus, to: OrderStatus): boolean => NEXT[from].includes(to);

export function eventForTransition(from: OrderStatus, to: OrderStatus): EventName | null {
  if (to === "supplier_order") return "supplier.order.created";
  if (to === "received") return "product.received";
  if (from === "quality_check" && to === "ready_to_ship") return "quality_check.completed";
  if (to === "shipped") return "shipment.created";
  if (to === "delivered") return "shipment.delivered";
  return null;
}
