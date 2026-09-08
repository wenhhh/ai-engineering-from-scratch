# 综合实践 08：生产级 RAG 聊天机器人（Production RAG Chatbot，TypeScript）

聊天界面骨架通过服务器发送事件（Server-Sent Events，SSE）
流式传输锚定引用的回答。与 `../main.py` 中的 Python 流水线配合使用。对话状态存储
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
npm start          # 执行一轮自检，以状态码 0 退出
npm run serve      # 在 127.0.0.1:<port> 上运行交互式 HTTP 服务器
```

未设置 `PORT` 时，交互式服务器选择空闲端口，在 `/` 挂载聊天
HTML 客户端，并通过 `GET /chat/stream?sessionId=...&q=...` 流式传输。
演示客户端使用 `EventSource`，监听 `session`、`citations`、`token`
以及 `done` 事件。

## 测试（Tests）

通过 tsx 使用 `node --test` 测试运行器。覆盖范围：

- SessionStore：创建、查找、追加、列出，标识符不存在时不执行操作。
- SSE 编码器与解析器往返验证（Round-Trip）；按司法管辖区标签提升检索排名；
  分词器备用路径与 "See also" 尾部。
- 服务器：`/`、`/health`、`/chat/stream` 正常路径（session + citations +
  token + done），缺少 q 时返回 400，多轮会话持久保存，
  `/sessions` 列表。
