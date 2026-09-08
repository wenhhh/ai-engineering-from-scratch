# 多智能体软件团队（Multi-Agent Software Team，TypeScript 骨架）

采用多个 TypeScript 文件实现多智能体软件团队综合实践（Capstone）骨架。
规划者、编码者和评审者智能体共享工作空间，通过
协调者轮转。工作树桩（Worktree Stub）通过 execFile 启动子进程，
带拒绝列表（Denylist），并拒绝 shell 元字符（Metacharacter）。

## 目录结构（Layout）

- `src/index.ts`：演示运行器。
- `src/agent.ts`：`Agent` 基类及 `PlannerAgent`、`CoderAgent`、`ReviewerAgent`。
- `src/coordinator.ts`：轮询循环（Round-Robin Loop）与轮转追踪。
- `src/workspace.ts`：共享内存文件系统与消息日志。
- `src/runtime.ts`：带拒绝列表的 `child_process.execFile` 工作树桩。
- `src/types.ts`：共享类型。
- `tests/*.test.ts`：通过 `tsx` 运行 `node --test` 风格测试。

## 安装（Install）

```bash
npm install
```

## 运行（Run）

```bash
npm start
```

## 验证（Verify）

```bash
npm run typecheck
npm test
```

## 规格参考（Spec References）

- 来源课程：`phases/19-capstone-projects/10-multi-agent-software-team/docs/en.md`
- [MetaGPT](https://github.com/FoundationAgents/MetaGPT)：基于角色的多智能体框架。
