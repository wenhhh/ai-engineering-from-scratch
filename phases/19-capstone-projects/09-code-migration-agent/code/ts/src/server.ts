/**
 * 迁移仪表盘与 JSON 查询接口。
 * HTML 展示文案中文化；JSON 字段、路由和状态枚举保持不变。
 * 本例直接拼接夹具字段到 HTML，未实现通用 HTML 转义或身份认证；不能直接接收不可信仓库数据。
 */

import { Hono } from "hono";
import { rolledUpStats } from "./migrations.js";
import type { Migration } from "./types.js";

export function buildApp(migrations: Migration[]): Hono {
  const app = new Hono();

  app.get("/", (c) => c.html(renderDashboardHtml(migrations)));
  app.get("/dashboard", (c) => c.html(renderDashboardHtml(migrations)));

  app.get("/migrations", (c) =>
    c.json({
      stats: rolledUpStats(migrations),
      migrations: migrations.map((m) => ({
        id: m.id,
        repo: m.repo,
        state: m.state,
        sourceRuntime: m.sourceRuntime,
        targetRuntime: m.targetRuntime,
        turns: m.turns,
        spentUsd: m.spentUsd,
      })),
    }),
  );

  app.get("/migrations/:id", (c) => {
    const id = c.req.param("id");
    const m = migrations.find((x) => x.id === id);
    if (!m) return c.json({ error: "not_found", id }, 404);
    return c.json(m);
  });

  return app;
}

export function renderDashboardHtml(migrations: Migration[]): string {
  const stats = rolledUpStats(migrations);
  const rows = migrations
    .map((m) => {
      const passedFiles = m.files.filter((f) => f.status === "passed").length;
      const pct = m.files.length === 0 ? 0 : Math.round((passedFiles / m.files.length) * 100);
      return [
        "<tr>",
        `<td><a href="/migrations/${m.id}">${m.repo}</a></td>`,
        `<td>${m.sourceRuntime} → ${m.targetRuntime}</td>`,
        `<td>${m.state}</td>`,
        `<td>${pct}%</td>`,
        `<td>${m.turns}/${m.maxTurns}</td>`,
        `<td>$${m.spentUsd.toFixed(2)}/$${m.budgetUsd}</td>`,
        "</tr>",
      ].join("");
    })
    .join("\n");
  return [
    "<!doctype html>",
    "<html><head><meta name='viewport' content='width=device-width, initial-scale=1'><title>代码迁移仪表盘</title>",
    "<style>",
    "*,*::before,*::after{box-sizing:border-box;}",
    "body{font-family:system-ui,sans-serif;margin:0 auto;padding:2rem;max-width:960px;width:100%;}",
    ".table-wrap{max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;}",
    "table{border-collapse:collapse;width:100%;min-width:620px;}",
    "th,td{padding:.4rem .8rem;border-bottom:1px solid #ddd;text-align:left;}",
    "th{background:#f3f3f3;}",
    ".stats{display:flex;flex-wrap:wrap;gap:1rem;margin-bottom:1rem;}",
    ".stat{background:#fafafa;border:1px solid #ddd;padding:.6rem 1rem;border-radius:6px;flex:1 1 8rem;}",
    "small{overflow-wrap:anywhere;}",
    "@media(max-width:600px){body{padding:1rem}.stats{gap:.6rem}.stat{padding:.5rem .7rem}h1{font-size:1.5rem}}",
    "</style></head><body>",
    "<h1>代码迁移仪表盘</h1>",
    "<div class='stats'>",
    `<div class='stat'><b>${stats.total}</b> 个迁移任务</div>`,
    `<div class='stat'>${stats.running} 个进行中</div>`,
    `<div class='stat'>${stats.passed} 个通过</div>`,
    `<div class='stat'>${stats.failed} 个失败</div>`,
    `<div class='stat'>$${stats.spentUsd.toFixed(2)} 已支出</div>`,
    "</div>",
    "<div class='table-wrap'><table><thead><tr>",
    "<th>仓库</th><th>迁移方向</th><th>状态</th><th>进度</th><th>轮数</th><th>费用</th>",
    "</tr></thead><tbody>",
    rows,
    "</tbody></table></div>",
    "<p><small>每 2 秒自动刷新。接口：/migrations、/migrations/:id。状态：running（进行中）、passed（通过）、failed（失败）、queued（排队中）。</small></p>",
    "<script>setTimeout(()=>location.reload(),2000)</script>",
    "</body></html>",
  ].join("\n");
}
