import { test } from "node:test";
import assert from "node:assert/strict";
import { canTransition, eventForTransition } from "./order-status";

test("não salta a compra ao fornecedor", () => {
  assert.equal(canTransition("pending", "supplier_order"), false);
  assert.equal(canTransition("confirmed", "supplier_order"), true);
});
test("estados finais não transitam", () => {
  assert.equal(canTransition("delivered", "cancelled"), false);
  assert.equal(canTransition("cancelled", "pending"), false);
});
test("eventos de automação", () => {
  assert.equal(eventForTransition("confirmed", "supplier_order"), "supplier.order.created");
  assert.equal(eventForTransition("quality_check", "ready_to_ship"), "quality_check.completed");
  assert.equal(eventForTransition("pending", "quote"), null);
});
