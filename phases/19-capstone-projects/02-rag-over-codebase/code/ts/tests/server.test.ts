/**
 * 代码库 RAG 的回归测试。
 * 仅翻译测试名称与本说明；查询夹具、断言、错误诊断和预期数值不变。
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { buildApp } from "../src/server.ts";
import { buildIndices } from "../src/retrieval.ts";
import type { QueryResponse } from "../src/types.ts";

function app() {
  const { dense, bm25 } = buildIndices();
  return buildApp(dense, bm25);
}

test("GET /healthz：返回 ok=true 与语料数量", async () => {
  const res = await app().fetch(new Request("http://x/healthz"));
  assert.equal(res.status, 200);
  const body = (await res.json()) as { ok: boolean; corpus: number };
  assert.equal(body.ok, true);
  assert.ok(body.corpus > 0);
});

test("GET /query：缺少 q 时返回 400", async () => {
  const res = await app().fetch(new Request("http://x/query"));
  assert.equal(res.status, 400);
});

test("GET /query?q=...：返回引用", async () => {
  const res = await app().fetch(
    new Request("http://x/query?q=" + encodeURIComponent("rank fusion")),
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as QueryResponse;
  assert.ok(body.citations.length > 0);
});

test("POST /query：校验 topK 上限", async () => {
  const res = await app().fetch(
    new Request("http://x/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q: "auth", topK: 9999 }),
    }),
  );
  assert.equal(res.status, 400);
});

test("POST /query：有效请求体得到可解析的响应", async () => {
  const res = await app().fetch(
    new Request("http://x/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q: "authorization", topK: 3 }),
    }),
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as QueryResponse;
  assert.ok(body.citations.length <= 3);
});

test("GET /query?q=%20：纯空白查询返回 400", async () => {
  const res = await app().fetch(
    new Request("http://x/query?q=" + encodeURIComponent("   ")),
  );
  assert.equal(res.status, 400);
});

test("POST /query：纯空白 q 返回 400", async () => {
  const res = await app().fetch(
    new Request("http://x/query", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q: "   " }),
    }),
  );
  assert.equal(res.status, 400);
});

test("未知路径：返回 404 JSON 响应", async () => {
  const res = await app().fetch(new Request("http://x/missing"));
  assert.equal(res.status, 404);
});
