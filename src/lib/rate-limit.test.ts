import { test } from "node:test";
import assert from "node:assert/strict";
import { rateLimit } from "./rate-limit";

test("memória: bloqueia depois do máximo", async () => {
  delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const k = `t-${Math.random()}`;
  assert.equal(await rateLimit(k, 2, 60_000), true);
  assert.equal(await rateLimit(k, 2, 60_000), true);
  assert.equal(await rateLimit(k, 2, 60_000), false);
});

test("Redis: usa o contador partilhado", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example"; process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
  const realFetch = globalThis.fetch; let n = 0; let seen = "";
  globalThis.fetch = (async (url: string, init: RequestInit) => { seen = `${url} ${init.body}`; n += 1; return new Response(JSON.stringify([{ result: n }, { result: 1 }])); }) as typeof fetch;
  try {
    assert.equal(await rateLimit("x", 2, 1000), true);
    assert.equal(await rateLimit("x", 2, 1000), true);
    assert.equal(await rateLimit("x", 2, 1000), false);
    assert.match(seen, /redis\.example\/pipeline .*INCR/);
  } finally { globalThis.fetch = realFetch; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; }
});

test("Redis em baixo: cai para memória em vez de falhar", async () => {
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.example"; process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("down"); }) as typeof fetch;
  const origErr = console.error; console.error = () => {};
  try {
    const k = `d-${Math.random()}`;
    assert.equal(await rateLimit(k, 1, 60_000), true);
    assert.equal(await rateLimit(k, 1, 60_000), false);
  } finally { globalThis.fetch = realFetch; console.error = origErr; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; }
});
