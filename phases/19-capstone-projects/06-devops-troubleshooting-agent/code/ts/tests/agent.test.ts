/**
 * 运维排障示例的回归测试。
 * 只翻译名称与说明；签名载荷、密钥夹具、断言、错误值和匹配正则不变。
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mockAgent } from "../src/agent.js";

describe("mockAgent", () => {
  it("针对内存告警返回排序后的 OOM 假设", () => {
    const report = mockAgent("OOMKilled payments-api");
    assert.equal(report.topHypotheses.length, 2);
    const ranks = report.topHypotheses.map((h) => h.rank);
    assert.deepEqual(ranks, [1, 2]);
    const first = report.topHypotheses[0];
    assert.ok(first);
    assert.match(first.summary, /OOMKilled/);
  });

  it("针对重启告警返回 CrashLoop 假设", () => {
    const report = mockAgent("auth-svc CrashLoopBackOff");
    assert.equal(report.topHypotheses.length, 1);
    const first = report.topHypotheses[0];
    assert.ok(first);
    assert.match(first.summary, /CrashLoopBackOff/);
  });

  it("未知告警回退到线索不足的假设", () => {
    const report = mockAgent("some-unknown-alert");
    assert.equal(report.topHypotheses.length, 1);
    const first = report.topHypotheses[0];
    assert.ok(first);
    assert.match(first.summary, /telemetry/);
  });

  it("每次调用生成不同的事件 ID", () => {
    const a = mockAgent("OOMKilled");
    const b = mockAgent("OOMKilled");
    assert.ok(a.incidentId.startsWith("inc-"));
    assert.ok(b.incidentId.startsWith("inc-"));
    assert.notEqual(a.incidentId, b.incidentId);
  });
});
