# 综合实践 06：运维故障排查智能体（DevOps Troubleshooting Agent，TypeScript）

为 `../main.py` 中的值班智能体提供 Slack 集成骨架。暴露
斜杠命令（Slash Command）端点与交互（按钮点击）端点，两者均受
Slack 的 HMAC-SHA256 请求签名与 5 分钟重放窗口（Replay Window）保护。
只有 Slack 卡片获批后才执行破坏性修复。

## 目录结构（Layout）

```text
ts/
  package.json
  tsconfig.json
  src/
    index.ts          # 入口，演示 + HTTP 服务器
    server.ts         # hono 应用，/slack/command + /slack/interactivity
    slack_verify.ts   # HMAC v0 验证 + 时序安全比较（Timing-Safe Compare）
    agent.ts          # 模拟假设排序器（Mocked Hypothesis Ranker）
    blocks.ts         # Block Kit 响应构建器
    types.ts          # Hypothesis, AgentReport, SlackResponse, OutboundCall
  tests/
    slack_verify.test.ts
    agent.test.ts
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

设置 `SLACK_SIGNING_SECRET=...` 可覆盖占位密钥。
交互式服务器打印选定端口（未设置 `PORT` 时随机选择）。

## 测试（Tests）

通过 tsx 使用 `node --test` 测试运行器。覆盖范围：

- Slack 签名验证：有效签名通过，篡改签名被
  拒绝，过期时间戳（偏差 >5 分钟）被拒绝，非数字时间戳被
  拒绝，并在恒定时间比较（Constant-Time Compare）前覆盖长度不匹配路径。
- 模拟智能体：OOM 关键词路径、CrashLoop 关键词路径和备用路径。
- 服务器：`/health`、`/slack/command` 的正常／篡改／过期路径，
  以及 `/slack/interactivity` 的批准操作。
