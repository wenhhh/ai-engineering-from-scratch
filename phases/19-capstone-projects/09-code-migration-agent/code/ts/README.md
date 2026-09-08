# 代码迁移智能体仪表盘（Code Migration Agent Dashboard，TypeScript 骨架）

代码迁移智能体综合实践（Capstone）的仪表盘层采用多个
TypeScript 文件实现骨架。Python 智能体在沙箱中运行；此服务器为
操作人员渲染进度。

## 目录结构（Layout）

- `src/index.ts`：入口，模拟时钟步进（Tick），可选提供 HTTP 服务。
- `src/server.ts`：Hono 路由 `/`、`/dashboard`、`/migrations`、`/migrations/:id`。
- `src/migrations.ts`：逐文件状态机（State Machine）与种子数据。
- `src/cost.ts`：轮次计数与美元预算强制执行。
- `src/types.ts`：共享类型。
- `tests/*.test.ts`：通过 `tsx` 运行 `node --test` 风格测试。

## 安装（Install）

```bash
npm install
```

## 运行（Run）

```bash
npm start         # 离线：模拟 40 个步进，打印汇总
npm run serve     # 在 PORT（默认 8009）上提供 HTML 仪表盘服务
```

## 验证（Verify）

```bash
npm run typecheck
npm test
```

## 规格参考（Spec References）

- 来源课程：`phases/19-capstone-projects/09-code-migration-agent/docs/en.md`
- 配方（Recipe）：[OpenRewrite](https://docs.openrewrite.org)、libcst。
