# 第 12 课：视频理解流水线（Video Understanding Pipeline，TypeScript 界面）

本项目是综合实践的 TypeScript 部分。Python 侧（`../main.py`）演示合成场景的
多向量索引（Multi-Vector Index）与时序定位（Temporal Grounding）。本项目提供独立仪表盘
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

## 实现边界

四阶段状态按创建时间和固定耗时推算，读取作业时也会推进状态；没有真实工作队列，
没有接入 Python 检索器，更没有下载视频、抽帧或调用模型。作业问题在此只作展示，
可以翻译；Python 中影响检索排名的英文查询与语料保留原值，并在源码中提供释义。
HTML 直接拼接作业字段，未做通用转义或认证，只应使用可信夹具。

课程说明见 [中文课程](../../docs/zh.md)，固定英文对照为 `../../docs/en.md`。
