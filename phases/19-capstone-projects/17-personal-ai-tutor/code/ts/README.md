# 第 17 课：个人 AI 导师（Personal AI Tutor，TypeScript 网页应用）

本项目是综合实践的 TypeScript 部分。Python 侧交付学习者模型与
导师策略；本项目暴露网页应用接口：课程有向无环图（DAG）
遍历器、基于答对比例的平滑掌握度，以及间隔翻倍／减半的简化重复练习
调度器，通过两个 HTTP 路由提供服务。这里并未实现真实 BKT 或 FSRS 算法。

## 目录结构（Layout）

```text
src/
  index.ts       入口：演示（默认）或 HTTP 服务器（--serve）
  server.ts      Hono 路由（GET /lesson/next、POST /lesson/:id/submit）
  curriculum.ts  DAG 测试夹具 + Kahn 拓扑排序（Topological Sort）+ 下一课选择器
  mastery.ts     MasteryStore（逐课答对比例的加权平滑）
  repetition.ts  scheduleNextDue（间隔翻倍／减半，并钳制范围）
  types.ts       Lesson, Mastery, Pick
tests/
  curriculum.test.ts  拓扑顺序、平滑分数、简化间隔调度
```

## 运行（Run）

```bash
npm install
npm run typecheck
npm test
npm start            # 自动结束的课程遍历
npm run serve        # 在 :8090 上运行 HTTP 服务器
```


## 实现边界与中文化说明

课程标题、控制台文案与可选课程提示已中文化；课程 ID、原因枚举及错误响应保留机器契约。
`correct` 由调用者提交，服务器不检查真实答案，也不生成苏格拉底式问答。
全部调用共享一个内存掌握度对象，没有账号隔离或持久化，不应用于记录真实儿童学习资料。
选择器先遍历合格的新课，再考虑到期且分数低于 0.95 的复习项；返回 `done` 仅表示
当前没有候选，并不是永久完成证明。测试中的到期复习用例也允许返回空值。

Python 的 BKT 模拟见 `../main.py`，与本 TS 服务不相互调用；课程说明见 `../../docs/zh.md`。
