/**
 * SSE 聊天示例回归测试：只翻译测试名称与说明。
 * 原始断言、输入夹具、英文回答契约、事件和消息数量保持原样。
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/server.js";
import { parseSseStream } from "../src/stream.js";

describe("服务路由", () => {
  it("GET / 返回 HTML 客户端", async () => {
    const { app } = buildApp();
    const res = await Promise.resolve(app.request("/"));
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/html/);
  });

  it("GET /health 返回 ok 和会话数", async () => {
    const { app } = buildApp();
    const res = await Promise.resolve(app.request("/health"));
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok: boolean; sessions: number };
    assert.equal(body.ok, true);
    assert.equal(body.sessions, 0);
  });

  it("GET /chat/stream 缺少 q 时返回 400", async () => {
    const { app } = buildApp();
    const res = await Promise.resolve(app.request("/chat/stream"));
    assert.equal(res.status, 400);
  });

  it("GET /chat/stream 发出 session、citations、token、done 事件", async () => {
    const { app } = buildApp();
    const res = await Promise.resolve(
      app.request(
        "/chat/stream?sessionId=t-1&role=analyst&jurisdiction=GDPR&q=erasure%20right",
      ),
    );
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/event-stream/);
    const events = parseSseStream(await res.text());
    const names = events.map((e) => e.event);
    assert.ok(names.includes("session"));
    assert.ok(names.includes("citations"));
    assert.ok(names.includes("done"));
    assert.ok(events.filter((e) => e.event === "token").length > 0);
  });

  it("同一进程中两次问答保留会话消息", async () => {
    const { app, sessions } = buildApp();
    const url = "/chat/stream?sessionId=p-1&role=analyst&jurisdiction=GDPR&q=";
    const r1 = await Promise.resolve(app.request(url + "first"));
    await r1.text();
    const r2 = await Promise.resolve(app.request(url + "second"));
    await r2.text();
    const s = sessions.get("p-1");
    assert.ok(s);
    assert.equal(s.turns.length, 4);
    assert.equal(s.turns[0]?.role, "user");
    assert.equal(s.turns[1]?.role, "assistant");
    assert.equal(s.turns[2]?.role, "user");
    assert.equal(s.turns[3]?.role, "assistant");
  });

  it("GET /sessions 列出内存中存储的会话", async () => {
    const { app } = buildApp();
    const r = await Promise.resolve(
      app.request("/chat/stream?sessionId=u-1&role=r&jurisdiction=GDPR&q=hi"),
    );
    await r.text();
    const sres = await Promise.resolve(app.request("/sessions"));
    const data = (await sres.json()) as {
      sessions: Array<{ id: string; turnCount: number }>;
    };
    const found = data.sessions.find((s) => s.id === "u-1");
    assert.ok(found);
    assert.equal(found.turnCount, 2);
  });
});
