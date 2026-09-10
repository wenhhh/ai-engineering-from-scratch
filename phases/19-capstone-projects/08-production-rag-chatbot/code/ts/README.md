# 综合实践 08：生产级 RAG 聊天机器人（Production RAG Chatbot，TypeScript）

聊天界面骨架通过服务器发送事件（Server-Sent Events，SSE）
流式传输附带引用的模拟回答。它与 `../main.py` 是独立示例，没有调用 Python 流水线。对话状态存储
在进程内以 `sessionId` 为键的 Map 中，因此相同会话标识符可以驱动
多轮对话。

## 目录结构（Layout）

```text
ts/
  package.json
  tsconfig.json
  src/
    index.ts        # 入口，演示 + HTTP 服务器
    server.ts      # hono 应用，/、/chat/stream（SSE）、/sessions、/health
    session.ts     # SessionStore (Map<sessionId, Session>)
    stream.ts      # SSE 帧编码器 + 解析器 + 模拟检索 + 分词器（Tokenizer）
    types.ts        # Session, Turn, Citation, KbEntry, SseEvent
  tests/
    session.test.ts
    stream.test.ts
    server.test.ts
```

## 运行（Run）

```bash
npm install
npm run typecheck
npm test
npm start          # 执行演示并打印自检结果；结果为 false 时不会主动非零退出
npm run serve      # 在 127.0.0.1:<port> 上运行交互式 HTTP 服务器
```

未设置 `PORT` 时，交互式服务器选择空闲端口，在 `/` 挂载聊天
HTML 客户端，并通过 `GET /chat/stream?sessionId=...&q=...` 流式传输。
服务端会发送 `session`、`citations`、`token` 与 `done` 事件。浏览器客户端使用
`EventSource`，实际注册的是 `citations`、`token` 和 `done` 监听器，以及错误处理。

## 测试（Tests）

通过 tsx 使用 `node --test` 测试运行器。覆盖范围：

- SessionStore：创建、查找、追加、列出，标识符不存在时不执行操作。
- SSE 编码器与解析器往返验证（Round-Trip）；按司法管辖区标签提升检索排名；
  分词器备用路径与 "See also" 尾部。
- 服务器：`/`、`/health`、`/chat/stream` 正常路径（session + citations +
  token + done），缺少 q 时返回 400，同一进程中保存多轮会话，
  `/sessions` 列表。


## 教学实现与中文化边界

页面按钮、提示与用户／助手标签已中文化；检索仍按英文单词重叠评分，不支持中文语义检索。
可用 `erasure right` 等原有英文查询观察效果。回答中的原始政策片段、引用标识、
`Per` 与 `See also` 等前缀保留，是因为现有断言和事件分片计数依赖这些文本。
源码提供中文释义，不以更改测试夹具来掩盖行为变化。

TypeScript 只对匹配的策略标签加分，不过滤其他标签，也不验证角色；与 Python 的
标签过滤示例并不等价。请求可自行指定会话 ID、角色和策略标签；复用已有会话 ID
时保留最初的会话元数据，但本次检索使用本次请求的标签。没有真实身份认证、授权、
会话隔离、数据库持久化或提示缓存，不应直接当作受监管业务的生产实现。

回答是拼接首条片段并列出其他文档，不调用 LLM，也不判断每个结论是否被引用支持。
`totalTokens` 表示按空白拆分的流式片段数，并非模型 tokenizer 的计数。客户端断开后
可能留下尚未回答的用户消息。固定政策条目为教学简化，未在本轮作事实或法律更新核验。
