# 第 16 课：GitHub 问题到 PR 智能体（GitHub Issue-to-PR Agent，TypeScript 网络回调接收器）

本项目是综合实践的 TypeScript 部分。Python 侧交付智能体循环与
分发器，YAML 侧交付 Actions 工作流。本项目是 GitHub
App 网络回调（Webhook）接收器：对原始请求体进行 HMAC 验证，按事件类型路由，
对 `issues.opened` 分发一个智能体桩（Stub Agent）。

## 目录结构（Layout）

```text
src/
  index.ts    入口：演示（默认）或 HTTP 服务器（--serve）
  server.ts   Hono 网络回调接收器（POST /webhook）
  verify.ts   X-Hub-Signature-256 HMAC，时序安全（Timing-Safe）
  router.ts   按事件类型路由（ping、issues、pull_request）
  agent.ts    智能体桩 + 审计日志（Audit Log）
  types.ts    载荷与审计结构
tests/
  verify.test.ts  签名通过、篡改、路由路径
```

## 运行（Run）

```bash
npm install
npm run typecheck
npm test
npm start            # 自动结束的演示（进程内重放）
npm run serve        # 在 :8081 上运行 HTTP 服务器
```

HMAC 密钥从 `GH_WEBHOOK_SECRET` 读取，演示
默认使用 `demo-shared-secret`。
