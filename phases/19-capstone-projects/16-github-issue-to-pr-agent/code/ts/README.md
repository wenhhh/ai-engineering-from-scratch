# 第 16 课：GitHub 问题到 PR 智能体（GitHub Issue-to-PR Agent，TypeScript 网络回调接收器）

本项目是综合实践的 TypeScript 部分。Python 侧模拟智能体循环与
调度器；当前目录未交付可直接部署的 Actions 工作流。本项目是 GitHub
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


## 实现边界与中文化说明

`dispatchAgent` 只追加两条内存审计日志，返回 `agent/issue-N` 字符串，不创建分支、PR 或沙箱。
默认演示的“已调度”不是代码修复完成；Python 状态机与 TS 接收器也没有相互调用。
HMAC 校验使用原始请求体，未实现投递 ID 去重、事件头认证、仓库允许列表或 GitHub App 安装授权。
`issue.number` 和 `issue.title` 没有完整的运行时类型检查。日志没有持久化，重启即丢失。
接口错误与签名夹具保留英文；日志说明、控制台和命令行帮助已中文化。

Python 模拟见 `../main.py`，课程中文说明见 `../../docs/zh.md`。
