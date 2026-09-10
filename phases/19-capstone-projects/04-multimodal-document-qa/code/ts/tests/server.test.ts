/**
 * 文档查看器回归测试。
 * 仅翻译名称与说明；断言、匹配正则、夹具标题与输入保持原样。
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/server.js";

describe("服务路由", () => {
  const app = buildApp();

  it("GET /health 返回 ok", async () => {
    const res = await app.request("/health");
    assert.equal(res.status, 200);
    const body = await res.json() as { ok: boolean };
    assert.equal(body.ok, true);
  });

  it("GET / 返回 HTML 索引页", async () => {
    const res = await app.request("/");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/html/);
  });

  it("GET /document/:id 在 Accept 指定 JSON 时返回 JSON", async () => {
    const res = await app.request("/document/10k-acme-2025", {
      headers: { accept: "application/json" },
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { id: string; evidence: unknown[] };
    assert.equal(body.id, "10k-acme-2025");
    assert.ok(Array.isArray(body.evidence) && body.evidence.length >= 1);
  });

  it("GET /document/:id 默认返回 HTML", async () => {
    const res = await app.request("/document/10k-acme-2025");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/html/);
  });

  it("GET /document/missing 返回 404", async () => {
    const res = await app.request("/document/missing", {
      headers: { accept: "application/json" },
    });
    assert.equal(res.status, 404);
  });

  it("GET /document/bad.id 对不允许的字符返回 400", async () => {
    const res = await app.request("/document/has.dot", {
      headers: { accept: "application/json" },
    });
    assert.equal(res.status, 400);
  });
});
