# 代码迁移智能体仪表盘（Code Migration Agent Dashboard，TypeScript 骨架）

代码迁移智能体综合实践（Capstone）的仪表盘层采用多个
TypeScript 文件实现示例框架。当前仅模拟迁移进度并渲染仪表盘，
没有启动 Python 智能体、真实沙箱或迁移工具。

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

- 来源课程：[中文课程](../../docs/zh.md)；固定英文对照：`../../docs/en.md`
- 配方（Recipe）：[OpenRewrite](https://docs.openrewrite.org)、libcst。

## 实现边界

文件改写、构建与测试状态由内存状态机和随机数产生；`passed` 不代表真实迁移验收通过。
预算在一次步进和计费之后检查，不会预先阻止超预算的当前步。文件失败后不会再次尝试修复。
页面中的机器状态保留英文并提供中文释义；接口 JSON 的字段和值不随界面翻译变化。
HTML 直接拼接输入字段，未提供通用转义或认证，演示时只使用可信夹具。
