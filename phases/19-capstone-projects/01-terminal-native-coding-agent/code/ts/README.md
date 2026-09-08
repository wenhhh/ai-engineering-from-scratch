# 综合实践 19/01：终端原生编码智能体（Terminal-Native Coding Agent，TypeScript）

采用多个 TypeScript 文件实现 `../docs/en.md` 所述的计划／行动／观察循环（Plan/Act/Observe Loop）运行框架（Harness）。
完全离线、行为确定，不发起网络调用。

## 目录结构（Layout）

```text
src/
  index.ts     入口；运行脚本化演示与评估（Evaluation），随后以状态码 0 退出
  repl.ts      交互式命令解析器（run / eval / help / quit）
  harness.ts   通过钩子总线（Hook Bus）串联的计划／行动／观察循环
  hooks.ts     八事件钩子总线，以及破坏性命令防护机制（Guard）
  model.ts     驱动演示的脚本化离线大语言模型（Large Language Model，LLM）
  tools.ts     read_file + run_shell，参数由 zod 校验
  plan.ts     PlanState（重写待办事项）+ Budget（轮次／词元／美元上限）
  eval.ts      对三个离线任务的通过／失败次数进行简单计数
  types.ts     共享数据结构定义
tests/
  harness.test.ts
  tools.test.ts
```

## 运行（Run）

```bash
npm install
npm start                # 运行脚本化演示与离线评估，以状态码 0 退出
npm start -- --repl      # 打开框架的交互式读取求值打印循环（Read-Eval-Print Loop，REPL）
npm test                 # 通过 tsx 使用 node --test 测试运行器
npm run typecheck        # tsc --noEmit
```

非交互式 `npm start` 执行路径会断言评估报告为 `passed=3
failed=0`，并断言脚本化运行最终收敛到所有事项均已完成的计划。
任何偏离都会使本次运行失败。
