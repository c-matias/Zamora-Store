import { test } from "node:test";
import assert from "node:assert/strict";
import { sign, verifySignature } from "./signature";

const ts = String(Date.now());
test("assinatura válida", () => {
  const sig = sign("s3cret", ts, '{"a":1}');
  assert.equal(verifySignature({ secret: "s3cret", timestamp: ts, body: '{"a":1}', signature: sig }), true);
});
test("rejeita corpo alterado, segredo errado, replay e segredo vazio", () => {
  const sig = sign("s3cret", ts, '{"a":1}');
  assert.equal(verifySignature({ secret: "s3cret", timestamp: ts, body: '{"a":2}', signature: sig }), false);
  assert.equal(verifySignature({ secret: "outro", timestamp: ts, body: '{"a":1}', signature: sig }), false);
  assert.equal(verifySignature({ secret: "s3cret", timestamp: ts, body: '{"a":1}', signature: sig, now: Date.now() + 10 * 60_000 }), false);
  assert.equal(verifySignature({ secret: "", timestamp: ts, body: "x", signature: sign("", ts, "x") }), false);
  assert.equal(verifySignature({ secret: "s3cret", timestamp: ts, body: '{"a":1}', signature: "zz" }), false);
});

test("paridade com o backend FastAPI (mesmo vetor de teste)", () => {
  assert.equal(sign("s3cret", "1700000000000", '{"a":1}'), "8a6f992378d0d47b6fcdf1cc8d72e46ba5c789b2c9d3a538be31fe07d598ba6d");
});
