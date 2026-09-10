# 综合实践 19/02：代码库检索增强生成（RAG over Codebase，TypeScript）

采用多个 TypeScript 文件实现代码搜索应用编程接口（Application Programming Interface，API），对应
`../../docs/en.md` 所述的混合检索（Hybrid Retrieval）流水线。完全离线、行为确定，使用含六个分块（Chunk）的示例语料库，
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


## 示例的实际边界

语料中的六个分块是预先写好的，没有从真实仓库执行 AST 解析。FNV-1a 模拟嵌入
用于复现检索流程，不是语义嵌入模型；分词正则只识别 ASCII 字母、数字和下划线。
因此示例摘要、查询与测试夹具保留英文值，源码旁注提供中文解释。

两路检索在程序中依次执行；此 TypeScript 版本直接截取 RRF 融合结果，没有 Python
示例额外的词项重合重排器，也不生成自然语言答案。API 的引用来自预设路径与行号，
自探测只确认状态码和引用非空，不能证明检索准确性或真实答案已有证据支持。

服务只监听本机，未实现鉴权、限流或请求体大小限制。首次安装依赖需要访问 npm，
“离线运行”指依赖安装完成后的教学流程，不表示从空环境安装也不需要网络。
