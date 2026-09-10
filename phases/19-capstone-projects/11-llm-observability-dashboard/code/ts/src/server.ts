/**
 * 平面 JSON span 接收接口与中文仪表盘。
 * 保留路由、响应字段、HTTP 状态和错误契约；模型名称经过原有 HTML 转义。
 * 接收结果中的 accepted 状态不保证数组内每个 span 都有效，应检查计数器。
 * 没有认证、持久化、尾部采样或模型评估，不等同于 Python 示例中的全部功能。
 */

import { Hono } from "hono";
import { rollUpByModel } from "./rollup.js";
import type { ObservabilityStore } from "./spans.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildApp(store: ObservabilityStore): Hono {
  const app = new Hono();

  app.post("/trace", async (c) => {
    try {
      const body = await c.req.json();
      const counters = store.ingest(body);
      return c.json({ status: "accepted", counters }, 202);
    } catch (err) {
      return c.json({ error: "bad_request", message: String(err) }, 400);
    }
  });

  app.get("/", (c) => c.html(renderDashboardHtml(store)));
  app.get("/dashboard", (c) => c.html(renderDashboardHtml(store)));

  app.get("/dashboard.json", (c) =>
    c.json({
      counters: store.counters(),
      models: rollUpByModel(store.snapshot()),
    }),
  );

  app.get("/healthz", (c) =>
    c.json({ status: "ok", counters: store.counters() }),
  );

  return app;
}

export function renderDashboardHtml(store: ObservabilityStore): string {
  const rollups = rollUpByModel(store.snapshot());
  const counters = store.counters();
  const rows = rollups
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.model)}</td><td>${r.count}</td><td>${r.errors}</td>` +
        `<td>${r.inputTokens}</td><td>${r.outputTokens}</td>` +
        `<td>$${r.costUsd.toFixed(4)}</td>` +
        `<td>${r.p50LatencyMs}</td><td>${r.p95LatencyMs}</td><td>${r.p99LatencyMs}</td></tr>`,
    )
    .join("\n");
  return [
    "<!doctype html>",
    "<html><head><meta name='viewport' content='width=device-width, initial-scale=1'><title>大语言模型可观测性仪表盘</title>",
    "<style>",
    "*,*::before,*::after{box-sizing:border-box;}",
    "body{font-family:system-ui,sans-serif;margin:0 auto;padding:2rem;max-width:1100px;width:100%;}",
    ".table-wrap{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;}",
    "table{border-collapse:collapse;width:100%;min-width:760px;}",
    "th,td{padding:.4rem .8rem;border-bottom:1px solid #ddd;text-align:left;font-variant-numeric:tabular-nums;}",
    "th{background:#f3f3f3;}",
    ".stats{display:flex;flex-wrap:wrap;gap:1rem;margin-bottom:1rem;}",
    ".stat{background:#fafafa;border:1px solid #ddd;padding:.6rem 1rem;border-radius:6px;flex:1 1 10rem;}",
    "small{overflow-wrap:anywhere;}",
    "@media(max-width:600px){body{padding:1rem}.stats{gap:.6rem}.stat{padding:.5rem .7rem}h1{font-size:1.5rem}}",
    "</style></head><body>",
    "<h1>大语言模型可观测性仪表盘</h1>",
    "<div class='stats'>",
    `<div class='stat'><b>${counters.accepted}</b> 个 span 已接收</div>`,
    `<div class='stat'>${counters.held} 个保留在环形缓冲区</div>`,
    `<div class='stat'>${counters.rejected} 个被拒绝</div>`,
    "</div>",
    "<div class='table-wrap'><table><thead><tr>",
    "<th>模型</th><th>span 数</th><th>错误数</th><th>输入词元</th><th>输出词元</th>",
    "<th>费用</th><th>p50 毫秒</th><th>p95 毫秒</th><th>p99 毫秒</th>",
    "</tr></thead><tbody>",
    rows,
    "</tbody></table></div>",
    "<p><small>向 /trace POST 带 GenAI 字段的平面 JSON span；汇总 JSON 见 /dashboard.json。此接口不是标准 OTLP 接收器。</small></p>",
    "</body></html>",
  ].join("\n");
}
