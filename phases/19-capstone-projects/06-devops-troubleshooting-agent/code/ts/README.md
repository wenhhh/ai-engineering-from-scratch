# 综合实践 06：运维故障排查智能体（DevOps Troubleshooting Agent，TypeScript）

演示值班智能体的 Slack 集成接口，与 `../main.py` 是独立示例，并未调用该 Python 程序。
提供斜杠命令和按钮交互端点，两者都校验 HMAC-SHA256 请求签名与五分钟时间偏差窗口。
批准操作只生成回复文本，没有执行破坏性修复或调用 MCP；窗口内也没有请求去重。

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


## 示例的实际边界

告警分析仅按英文关键词返回固定假设；遥测证据为预设字符串，未查询真实集群。
`outboundLog` 只记录待发送消息，不向 Slack 发送请求。按钮操作没有核验审批者身份、
事件是否真实存在或是否已处理；未知动作也会进入“忽略”回复分支。

卡片按钮和说明已中文化；签名输入、错误枚举、审计标识及被消费者匹配的英文前缀
保留原值，源码附有中文解释。默认签名密钥是公开教学占位，不可用于真实部署。

演示入口只打印成功探测的数量；计数不足不会主动非零退出。演示中的签名篡改将
最后一位固定改为 0，原值已经为 0 时不构成篡改；独立测试使用不同位值确保篡改。
长度不符时的提前拒绝测试没有测量计时侧信道，不能当作整体安全认证。
