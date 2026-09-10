/**
 * 启动本地代码检索服务并执行自探测。
 * HTTP 方法、路由和错误消息保持原样；自探测只检查状态码与引用非空，不能证明答案正确。
 */

// 综合项目 19/02：代码库 RAG 查询 API（多文件 TypeScript 版本）。
//
// 固定原文参考：
//   本课 docs/en.md：混合检索与带引用的答案 API
//   Hono Web 框架                https://hono.dev/docs/
//   BM25（Robertson 与 Zaragoza）https://en.wikipedia.org/wiki/Okapi_BM25
//   倒数排名融合（RRF）           https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf
//
// 模块职责：index_store.ts 实现 FNV-1a 模拟嵌入与 BM25；retrieval.ts 实现 RRF；
// server.ts 注册 Hono 的 /healthz、/query 路由；本入口用 node:http 承载 fetch 处理器，
// 默认完成自探测后退出。带 --serve 参数则持续运行。

import * as http from "node:http";
import { Readable } from "node:stream";
import { buildIndices } from "./retrieval.ts";
import { buildApp } from "./server.ts";
import type { QueryResponse } from "./types.ts";
import { SAMPLE_CORPUS } from "./corpus.ts";

type FetchLike = (req: Request) => Response | Promise<Response>;

// 将 Node HTTP 请求桥接到 Fetch API；此示例会先完整缓存请求体，没有大小限制。
function nodeListener(fetchHandler: FetchLike) {
  return (req: http.IncomingMessage, res: http.ServerResponse): void => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      void (async () => {
        try {
          const url = `http://${req.headers.host ?? "localhost"}${req.url ?? "/"}`;
          const init: RequestInit = {
            method: req.method,
            headers: req.headers as Record<string, string>,
          };
          const method = (req.method ?? "GET").toUpperCase();
          if (method !== "GET" && method !== "HEAD" && chunks.length > 0) {
            init.body = Buffer.concat(chunks);
          }
          const response = await fetchHandler(new Request(url, init));
          res.statusCode = response.status;
          response.headers.forEach((v, k) => res.setHeader(k, v));
          if (response.body) {
            Readable.fromWeb(response.body as never).pipe(res);
          } else {
            res.end();
          }
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: (err as Error).message }));
        }
      })();
    });
  };
}

async function probe(server: http.Server, port: number): Promise<void> {
  const queries = [
    // 查询：S3 分段上传取消逻辑如何关联重试预算？查询是检索夹具，保留英文。
    "how is S3 multipart abort wired into retry budget",
    // 查询：授权逻辑集中在哪里？
    "where is authorization centralized",
    // 查询：排名融合如何工作？
    "how does rank fusion work",
  ];
  const get = (p: string): Promise<{ status: number; body: string }> =>
    new Promise((resolve, reject) => {
      const r = http.request(
        { host: "127.0.0.1", port, path: p, method: "GET" },
        (resp) => {
          const parts: Buffer[] = [];
          resp.on("data", (c: Buffer) => parts.push(c));
          resp.on("end", () =>
            resolve({
              status: resp.statusCode ?? 0,
              body: Buffer.concat(parts).toString("utf8"),
            }),
          );
        },
      );
      r.on("error", reject);
      r.end();
    });

  const health = await get("/healthz");
  console.log(`GET /healthz -> ${health.status} ${health.body}`);
  if (health.status !== 200) throw new Error(`healthz returned ${health.status}`);

  for (const q of queries) {
    const r = await get(`/query?q=${encodeURIComponent(q)}`);
    if (r.status !== 200) throw new Error(`query '${q}' returned ${r.status}`);
    const parsed = JSON.parse(r.body) as QueryResponse;
    console.log(`GET /query?q=${JSON.stringify(q)} -> ${r.status}`);
    console.log(`  稠密召回：${JSON.stringify(parsed.denseTop)}`);
    console.log(`  稀疏召回：${JSON.stringify(parsed.sparseTop)}`);
    console.log(`  融合结果：${JSON.stringify(parsed.fusedTop)}`);
    console.log(
      `  引用列表：${parsed.citations
        .map((c) => `${c.anchor}@${c.score.toFixed(4)}`)
        .join(", ")}`,
    );
    if (parsed.citations.length === 0) {
      throw new Error(`query '${q}' returned no citations`);
    }
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

async function main(): Promise<void> {
  const { dense, bm25 } = buildIndices();
  console.log(`已建立 ${dense.size()} 个分块的索引，语料共 ${SAMPLE_CORPUS.length} 条`);
  const app = buildApp(dense, bm25);
  const server = http.createServer(nodeListener(app.fetch as FetchLike));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("server address unavailable");
  const port = addr.port;
  console.log(`代码库 RAG API 正在监听 http://127.0.0.1:${port}`);
  if (process.argv.includes("--serve")) {
    process.on("SIGINT", () => server.close(() => process.exit(0)));
    return;
  }
  await probe(server, port);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
