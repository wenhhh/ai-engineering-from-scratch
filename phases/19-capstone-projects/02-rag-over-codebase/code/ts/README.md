# 综合实践 19/02：代码库检索增强生成（RAG over Codebase，TypeScript）

采用多个 TypeScript 文件实现代码搜索应用编程接口（Application Programming Interface，API），对应
`../docs/en.md` 所述的混合检索（Hybrid Retrieval）流水线。完全离线、行为确定，使用含六个分块（Chunk）的示例语料库，
由 node:http 承载 hono fetch 处理器。

## 目录结构（Layout）

```text
src/
  index.ts        入口；启动 node:http，执行自探测，以状态码 0 退出
  server.ts       hono 路由（/healthz、/query），POST 请求体经 zod 校验
  retrieval.ts    runQuery + 倒数排名融合（Reciprocal Rank Fusion，RRF），合并稠密检索与 BM25 结果
  index_store.ts  FNV-1a 哈希嵌入器（Hash Embedder）、余弦相似度（Cosine）、按字段加权的 BM25
  corpus.ts       六分块示例（uploader / auth / client / catalog）
  types.ts        Chunk, RankedChunk, QueryResponse, anchor()
tests/
  index_store.test.ts
  retrieval.test.ts
  server.test.ts
```

## 运行（Run）

```bash
npm install
npm start                # 启动 API，探测三个查询，以状态码 0 退出
npm start -- --serve     # 保持服务器运行；ctrl-c 停止
npm test                 # 通过 tsx 使用 node --test 测试运行器
npm run typecheck        # tsc --noEmit
```

非交互式 `npm start` 执行路径会断言 `/healthz` 返回 200，且
每个探测查询至少返回一条引用（Citation）。路由如下：

- `GET /healthz`：返回 `{ok, corpus}`。
- `GET /query?q=...`：执行混合查询。
- `POST /query`：使用 JSON `{q, topK?}`，由 zod 校验（`topK` 上限为 50）。
