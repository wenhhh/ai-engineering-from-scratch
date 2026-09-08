# 第 12 课：视频理解流水线（Video Understanding Pipeline，TypeScript 界面）

本项目是综合实践的 TypeScript 部分。Python 侧（`code/main.py`）负责
多向量索引（Multi-Vector Index）与时序定位（Temporal Grounding）。本项目交付仪表盘
部分：覆盖流水线四阶段（chunk、embed、index、qa）的 Hono 应用。

## 目录结构（Layout）

```text
src/
  index.ts     入口：演示（默认）或 HTTP 服务器（--serve）
  server.ts    Hono 路由（/、/jobs、/job/:id）+ HTML 索引页
  jobs.ts     JobStore + 测试夹具（Fixture）初始化器
  stages.ts    阶段推进 + 总体状态
  types.ts     Stage, StageState, Job
tests/
  stages.test.ts  作业状态转换（State Transition）+ 存储
```

## 运行（Run）

```bash
npm install
npm run typecheck
npm test
npm start              # 自动结束的演示
npm run serve          # 在 :8123 上运行 HTTP 服务器
```
