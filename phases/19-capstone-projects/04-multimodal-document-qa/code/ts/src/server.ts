/**
 * 文档查看器的 Hono 路由。
 * /health 为健康检查，/ 为索引页，/document/:id 按 Accept 请求头返回 JSON 或 HTML。
 * 只读取固定夹具，没有调用 Python 检索器，也没有提供页面图片或文件上传接口。
 */

import { Hono } from "hono";
import type { Context } from "hono";
import { getFixture } from "./fixtures.js";
import { renderDocument, renderIndex } from "./render.js";

export function buildApp(): Hono {
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/", (c) => c.html(renderIndex()));

  app.get("/document/:id", (c: Context) => {
    const id = c.req.param("id") ?? "";
    if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) {
      // 文档 ID 不合规则时返回 400；保留原英文错误契约。
      return c.json({ error: "bad document id" }, 400);
    }
    const doc = getFixture(id);
    if (!doc) {
      // 没有匹配夹具时返回 404。
      return c.json({ error: "unknown document" }, 404);
    }
    const accept = c.req.header("accept") ?? "";
    if (accept.includes("application/json")) {
      return c.json({
        id: doc.id,
        title: doc.title,
        query: doc.query,
        answer: doc.answer,
        pageWidth: doc.pageWidth,
        pageHeight: doc.pageHeight,
        pageImageUrl: doc.pageImageUrl,
        evidence: doc.evidence,
      });
    }
    return c.html(renderDocument(doc));
  });

  // 其他路径返回原有 not found 错误。
  app.notFound((c) => c.json({ error: "not found" }, 404));

  return app;
}
