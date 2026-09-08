# 第 17 课：个人 AI 导师（Personal AI Tutor，TypeScript 网页应用）

本项目是综合实践的 TypeScript 部分。Python 侧交付学习者模型与
导师策略；本项目暴露网页应用接口：课程有向无环图（DAG）
遍历器、BKT 风格学习者模型，以及 FSRS-lite 间隔重复（Spaced Repetition）
调度器，通过两个 HTTP 路由提供服务。

## 目录结构（Layout）

```text
src/
  index.ts       入口：演示（默认）或 HTTP 服务器（--serve）
  server.ts      Hono 路由（GET /lesson/next、POST /lesson/:id/submit）
  curriculum.ts  DAG 测试夹具 + Kahn 拓扑排序（Topological Sort）+ 下一课选择器
  mastery.ts     MasteryStore（逐课近似 BKT 更新）
  repetition.ts  scheduleNextDue（间隔翻倍／减半，并钳制范围）
  types.ts       Lesson, Mastery, Pick
tests/
  curriculum.test.ts  拓扑顺序、BKT 更新、FSRS 调度
```

## 运行（Run）

```bash
npm install
npm run typecheck
npm test
npm start            # 自动结束的课程遍历
npm run serve        # 在 :8090 上运行 HTTP 服务器
```
