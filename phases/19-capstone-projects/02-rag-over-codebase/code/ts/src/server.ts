/**
 * 基于 Hono 的本地查询 API。
 * GET 查询检查非空字符串；POST 另用 Zod 校验 q 与可选的 topK。
 * 英文错误值属于响应契约，保留原样；此教学服务没有鉴权、限流或持久化索引。
 */

import { Hono } from "hono";
import { z } from "zod";
import type { BM25Index, DenseIndex } from "./index_store.ts";
import { runQuery } from "./retrieval.ts";
import { SAMPLE_CORPUS } from "./corpus.ts";

// 请求体规则：q 不能为空或只含空白；topK 必须是 1—50 的整数。
export const QueryBody = z.object({
  q: z
    .string()
    .refine((s) => s.trim().length > 0, {
      message: "query must not be empty or whitespace",
    }),
  topK: z.number().int().positive().max(50).optional(),
});

export function buildApp(dense: DenseIndex, bm25: BM25Index): Hono {
  const app = new Hono();

  app.get("/healthz", (c) => c.json({ ok: true, corpus: SAMPLE_CORPUS.length }));

  app.get("/query", (c) => {
    const q = c.req.query("q");
    if (!q || q.trim().length === 0) {
      return c.json({ error: "query must not be empty or whitespace" }, 400);
    }
    return c.json(runQuery(q, dense, bm25));
  });

  // JSON 解析失败或请求体不合规则返回 400；成功则返回检索结果。
  app.post("/query", async (c) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
    const parsed = QueryBody.safeParse(raw);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? "bad body" }, 400);
    }
    const { q, topK = 5 } = parsed.data;
    return c.json(runQuery(q, dense, bm25, topK));
  });

  // 未匹配的路径返回 404 和原英文 not found 错误。
  app.notFound((c) => c.json({ error: "not found", path: c.req.path }, 404));

  return app;
}
