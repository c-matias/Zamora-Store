import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatePricing, priceForTargetMargin } from "./pricing";

test("margem para Portugal usa envio PT", () => {
  const r = calculatePricing(
    { supplierCost: 40000, supplierShipping: 1500, shippingPT: 1000, shippingAO: 9000, paymentFees: 900 },
    "PT",
    50000,
  );
  assert.equal(r.totalCost, 43400);
  assert.equal(r.grossMargin, 6600);
  assert.equal(r.marginPercent, 13.2);
});

test("margem para Angola usa envio AO", () => {
  const r = calculatePricing({ supplierCost: 40000, shippingPT: 1000, shippingAO: 9000 }, "AO", 55000);
  assert.equal(r.shippingApplied, 9000);
  assert.equal(r.grossMargin, 6000);
});

test("rejeita valores inválidos", () => {
  assert.throws(() => calculatePricing({ supplierCost: 10.5 }, "PT", 1000), RangeError);
  assert.throws(() => calculatePricing({ supplierCost: -1 }, "PT", 1000), RangeError);
});

test("preço para margem alvo", () => {
  assert.equal(priceForTargetMargin(80000, 20), 100000);
});
