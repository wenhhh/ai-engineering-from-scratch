# 第 13 课：无状态 MCP 服务器（Stateless MCP Server，TypeScript）

本项目是综合实践的 TypeScript 部分。Python 侧（`../main.py`）演示
注册中心与策略关卡；本项目负责 MCP 传输：手写
基于 stdio、以换行分隔的 JSON-RPC 2.0，并提供三个模拟故障工具。
它按固定英文快照实现 MCP `2026-07-28` 的教学子集，不用 `@modelcontextprotocol/sdk`，因此
你可以检查实际传输的每个字节。

虽然模拟故障存储会在同一进程内保留数据，但没有磁盘持久化；请求元数据仍按无状态方式处理。
每个请求都在 `params._meta` 中重复提供协议版本与客户端能力；
任何连接、进程或先前请求都不会建立
会话。服务器暴露必需的 `server/discover`，在
每个成功结果中声明身份，并发布确定性、可缓存工具列表。
`tools/call` 根据 `tools/list` 返回的相同有界模式
验证参数；已知工具的格式错误参数返回完整工具结果，
带 `isError: true`，绝不会到达执行器。

运行时身份为 `com.example/internal-incidents`。它使用示例域名
`example.com` 的反向域名（Reverse-DNS）命名空间；本 TS 示例不实际验证域名所有权。匹配的发布
`server.json` 必须使用相同名称，即使本地 npm 包有
自己的私有项目名。

## 目录结构（Layout）

```text
src/
  index.ts      入口：测试夹具（Fixture）演示（默认）或 stdio 循环（--serve）
  transport.ts  stdin 逐行读取 + 测试夹具重放
  protocol.ts   请求验证 / server/discover / tools/list / tools/call
  tools.ts      三个故障工具 + 执行器
  types.ts      JSON-RPC + 工具结构
tests/
  protocol.test.ts  无状态元数据、发现、工具、错误、往返验证
```

## 运行（Run）

```bash
npm install
npm run typecheck
npm test
npm start            # 自动结束的测试夹具演示
npm run serve        # 实际 stdio 循环（等待 stdin）
```

演示会自动结束。实际 stdio 服务器保持运行，直到输入
流关闭；没有 MCP 关闭请求或初始化握手。

## 实现边界

本例的版本、字段和错误码对应固定来源快照，不代表本轮核验了最新协议兼容性。
工具描述保留原协议文本，并在源码中提供中文释义；注解不构成权限强制执行。
`incidents_ack` 没有身份或审批检查，只将内存记录的 `acked` 设为 true。
Python 侧也只是令牌、审批和注册表模型，不验证真实 OAuth 签名或连接生产服务。

stdio 模式只输出 JSON-RPC 行；翻译后的演示标题不会污染该模式的 stdout。
课程说明见 [中文课程](../../docs/zh.md)，固定英文对照为 `../../docs/en.md`。
