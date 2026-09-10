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

- 来源课程：[中文课程](../../docs/zh.md)；固定英文对照：`../../docs/en.md`
- [MetaGPT](https://github.com/FoundationAgents/MetaGPT)：基于角色的多智能体框架。

## 实现边界与运行注意事项

本例没有调用模型、创建 Git 工作树、合并代码或执行生成的测试。编码者仅写入固定文件、
追加注释并生成 `assert True` 测试；评审者第二轮直接批准，因此批准不证明退款缺陷已修复。
计划与源码夹具参与工作空间指纹计算，保留英文，并在源码相邻处提供中文释义。

`launchWorktree` 会执行真实本地子进程，但不隔离目录、环境变量、网络或权限；
拒绝列表只是有限的字符串检查，不是安全边界。`BRANCH` 不会创建或切换分支。
只能在临时目录使用本例的固定可信命令，不应接收模型生成的任意命令。
