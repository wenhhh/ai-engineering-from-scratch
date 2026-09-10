/**
 * 视频作业中文列表与 JSON 查询接口。
 * 状态、字段与路由保留原值。HTML 未转义动态字段，也未实现认证，限定可信演示数据。
 * 页面与接口只显示按时间推算的状态，没有加载视频、执行模型或显示实际定位结果。
 */

import { Hono } from "hono";
import type { JobStore } from "./jobs.js";
import { advanceJob, overallStatus } from "./stages.js";

export function renderIndexHtml(store: JobStore): string {
  const rows = store
    .list()
    .map((j) => {
      advanceJob(j);
      return `<tr><td>${j.id}</td><td>${j.video_url}</td><td>${j.question}</td><td>${overallStatus(j)}</td></tr>`;
    })
    .join("");
  return `<!doctype html><meta charset="utf-8"><title>视频作业</title>
<style>body{font-family:system-ui;margin:2rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:.4rem .6rem;text-align:left}</style>
<h1>视频理解作业</h1>
<table><thead><tr><th>作业 ID</th><th>视频</th><th>问题</th><th>状态</th></tr></thead>
<tbody>${rows}</tbody></table>
<p>JSON 列表：<a href="/jobs">/jobs</a>，单个作业： <code>/job/&lt;id&gt;</code>。状态：pending（待处理）、running（进行中）、done（完成）、error（错误）。</p>`;
}

export function buildApp(store: JobStore): Hono {
  const app = new Hono();

  app.get("/", (c) => c.html(renderIndexHtml(store)));

  app.get("/jobs", (c) => c.json({ jobs: store.summaries() }));

  app.get("/job/:id", (c) => {
    const id = c.req.param("id");
    const body = store.detail(id);
    // 错误契约：找不到该作业，返回 HTTP 404。
    if (!body) return c.json({ error: "job not found", id }, 404);
    return c.json(body);
  });

  return app;
}
