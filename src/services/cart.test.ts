import { test } from "node:test";
import assert from "node:assert/strict";
import { addLine, cartCount, mergeItems, parseCart, removeLine, serializeCart, setQty, MAX_LINES, MAX_QTY, CartError } from "./cart";

test("parseCart: valores inválidos dão carrinho vazio", () => {
  for (const raw of [undefined, "", "lixo", "{}", '[{"v":"a","q":0}]', '[{"v":"a b","q":1}]', `[{"v":"a","q":${MAX_QTY + 1}}]`, JSON.stringify(Array.from({ length: MAX_LINES + 1 }, (_, i) => ({ v: `x${i}`, q: 1 })))]) {
    assert.deepEqual(parseCart(raw), [], String(raw));
  }
});
test("parseCart/serializeCart: ida e volta e junta duplicados", () => {
  assert.deepEqual(parseCart(serializeCart([{ v: "a", q: 2 }, { v: "b", q: 1 }])), [{ v: "a", q: 2 }, { v: "b", q: 1 }]);
  assert.deepEqual(parseCart('[{"v":"a","q":7},{"v":"a","q":7}]'), [{ v: "a", q: MAX_QTY }]);
});
test("addLine soma e respeita limites", () => {
  assert.deepEqual(addLine([{ v: "a", q: 9 }], "a", 5), [{ v: "a", q: MAX_QTY }]);
  assert.deepEqual(addLine([], "a", 0), [{ v: "a", q: 1 }]);
  const full = Array.from({ length: MAX_LINES }, (_, i) => ({ v: `x${i}`, q: 1 }));
  assert.throws(() => addLine(full, "novo", 1), CartError);
  assert.equal(addLine(full, "x0", 1).length, MAX_LINES);
});
test("setQty e removeLine", () => {
  assert.deepEqual(setQty([{ v: "a", q: 2 }], "a", 5), [{ v: "a", q: 5 }]);
  assert.deepEqual(setQty([{ v: "a", q: 2 }], "a", 0), []);
  assert.deepEqual(setQty([{ v: "a", q: 2 }], "a", NaN), []);
  assert.deepEqual(setQty([{ v: "a", q: 2 }], "a", 99), [{ v: "a", q: MAX_QTY }]);
  assert.deepEqual(removeLine([{ v: "a", q: 1 }, { v: "b", q: 1 }], "a"), [{ v: "b", q: 1 }]);
  assert.equal(cartCount([{ v: "a", q: 2 }, { v: "b", q: 3 }]), 5);
});
test("mergeItems", () => {
  assert.deepEqual(mergeItems([{ variantId: "a", quantity: 2 }, { variantId: "b", quantity: 1 }, { variantId: "a", quantity: 20 }]), [{ variantId: "a", quantity: MAX_QTY }, { variantId: "b", quantity: 1 }]);
});
