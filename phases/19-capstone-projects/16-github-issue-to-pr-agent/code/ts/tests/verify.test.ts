/**
 * 签名与路由回归测试。仅翻译名称与说明，保持原始夹具和断言；最后一项首先命中缺少 repository 的检查。
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { expectedSig, verifySignature } from "../src/verify.js";
import { AuditLog } from "../src/agent.js";
import { route } from "../src/router.js";

const SECRET = "test-secret";

test("expectedSig 对相同输入给出相同摘要", () => {
  const body = Buffer.from('{"a":1}', "utf8");
  const s1 = expectedSig(body, SECRET);
  const s2 = expectedSig(body, SECRET);
  assert.equal(s1, s2);
  assert.ok(s1.startsWith("sha256="));
});

test("verifySignature 接受匹配的签名", () => {
  const body = Buffer.from('{"action":"opened"}', "utf8");
  const sig = expectedSig(body, SECRET);
  assert.equal(verifySignature(body, sig, SECRET), true);
});

test("verifySignature 拒绝被修改的请求体", () => {
  const body = Buffer.from('{"action":"opened"}', "utf8");
  const sig = expectedSig(body, SECRET);
  const tampered = Buffer.from('{"action":"closed"}', "utf8");
  assert.equal(verifySignature(tampered, sig, SECRET), false);
});

test("verifySignature 拒绝不同密钥生成的签名", () => {
  const body = Buffer.from('{"a":1}', "utf8");
  const sig = expectedSig(body, "wrong");
  assert.equal(verifySignature(body, sig, SECRET), false);
});

test("verifySignature 拒绝缺少签名头", () => {
  const body = Buffer.from("{}", "utf8");
  assert.equal(verifySignature(body, undefined, SECRET), false);
});

test("路由器的 ping 响应回显 zen", () => {
  const audit = new AuditLog();
  const r = route(audit, "ping", { zen: "Hello", hook_id: 1 });
  assert.equal(r.code, 200);
  assert.deepEqual(r.body, { pong: "Hello", hook_id: 1 });
});

test("路由器在 issues.opened 时调用调度桩", () => {
  const audit = new AuditLog();
  const r = route(audit, "issues", {
    action: "opened",
    issue: { number: 7, title: "x" },
    repository: { full_name: "r/o" },
  });
  assert.equal(r.code, 202);
  const body = r.body as { dispatched: boolean; branch: string };
  assert.equal(body.dispatched, true);
  assert.equal(body.branch, "agent/issue-7");
  assert.equal(audit.count(), 2);
});

test("路由器跳过非 opened 动作", () => {
  const audit = new AuditLog();
  const r = route(audit, "issues", {
    action: "closed",
    issue: { number: 1, title: "x" },
    repository: { full_name: "r/o" },
  });
  assert.equal(r.code, 200);
  assert.equal((r.body as { skipped: boolean }).skipped, true);
  assert.equal(audit.count(), 0);
});

test("路由器拒绝缺少仓库和 issue 的载荷并返回 422", () => {
  const audit = new AuditLog();
  const r = route(audit, "issues", { action: "opened" });
  assert.equal(r.code, 422);
});
