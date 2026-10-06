import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize } from "./dashboard";

test("resumo do dashboard", () => {
  const s = summarize(
    [
      { status: "pending", payment_status: "to_confirm", total: 1000, margin: 100 },
      { status: "delivered", payment_status: "paid", total: 2000, margin: 300 },
      { status: "cancelled", payment_status: "paid", total: 5000, margin: 900 },
    ],
    [{ status: "draft" }, { status: "accepted" }],
  );
  assert.deepEqual(s, { pendingOrders: 1, processingOrders: 0, completedOrders: 1, pendingQuotes: 1, revenue: 2000, estimatedMargin: 400 });
});
