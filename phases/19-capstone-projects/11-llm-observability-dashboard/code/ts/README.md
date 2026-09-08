# 大语言模型可观测性仪表盘（LLM Observability Dashboard，TypeScript 骨架）

采用多个 TypeScript 文件实现大语言模型可观测性仪表盘综合实践（Capstone）骨架。
Hono 服务器接收 OpenTelemetry GenAI 跟踪区段（Span），保存在容量一万的环形
缓冲区（Ring Buffer）中，并渲染 p50/p95/p99 延迟和逐模型成本。

## 目录结构（Layout）

- `src/index.ts`：入口，填充合成跟踪区段，可选提供 HTTP 服务。
- `src/server.ts`：Hono 路由 `/trace`、`/`、`/dashboard`、`/dashboard.json`、`/healthz`。
- `src/spans.ts`：`RingBuffer` 和 `ObservabilityStore`（默认一万个跟踪区段）。
- `src/rollup.ts`：`percentile` 和 `rollUpByModel`。
- `src/pricing.ts`：2026 年逐模型价格与成本辅助函数。
- `src/types.ts`：共享类型。
- `tests/*.test.ts`：通过 `tsx` 运行 `node --test` 风格测试。

## 安装（Install）

```bash
npm install
```

## 运行（Run）

```bash
npm start         # 填充 1200 个合成跟踪区段，打印汇总
npm run serve     # 同时在 PORT（默认 8011）上提供 HTTP 摄取与仪表盘
```

## 验证（Verify）

```bash
npm run typecheck
npm test
```

## 规格参考（Spec References）

- 来源课程：`phases/19-capstone-projects/11-llm-observability-dashboard/docs/en.md`
- [OpenTelemetry GenAI 语义约定](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
