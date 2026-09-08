# 综合实践 19/03：实时语音助手（Realtime Voice Assistant，TypeScript）

采用多个 TypeScript 文件实现网页客户端运行框架（Web-Client Harness），对应
`../docs/en.md` 所述的流式语音（Streaming Voice）流水线。包含离线状态机（State Machine）模拟，
以及由 `ws` 包实现的实际 WebSocket 服务器。

## 目录结构（Layout）

```text
src/
  index.ts        入口；运行两个离线会话，探测实际 ws 服务，以状态码 0 退出
  server.ts       hono /healthz + 通过 WebSocketServer 执行 ws 协议升级（Upgrade）
  orchestrator.ts IDLE -> LISTENING -> WAITING -> THINKING -> SPEAKING，支持插话打断（Barge-In）
  vad.ts          轮次结束（Turn Completion）评分器 + 合成 20ms 帧生成器
  protocol.ts     经 zod 校验的帧封装（Frame Envelope，event / summary）
  types.ts        AudioChunk, Metrics, SessionOptions, SessionSummary
tests/
  vad.test.ts
  orchestrator.test.ts
  protocol.test.ts
```

## 运行（Run）

```bash
npm install
npm start                # 运行两个离线会话并执行 ws 自探测，以状态码 0 退出
npm start -- --serve     # 保持 ws 服务器运行；ctrl-c 停止
npm test                 # 通过 tsx 使用 node --test 测试运行器
npm run typecheck        # tsc --noEmit
```

非交互式 `npm start` 执行路径会断言无打断会话到达
`first_audio_out`，插话会话至少记录一次插话打断事件，
且实际 WebSocket 探测在连接关闭前收到一帧 `summary`。
