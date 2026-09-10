# 综合实践 19/01：终端原生编码智能体（Terminal-Native Coding Agent，TypeScript）

采用多个 TypeScript 文件实现 `../../docs/en.md` 所述的计划／行动／观察循环（Plan/Act/Observe Loop）运行框架（Harness）。
完全离线、行为确定，不发起网络调用。

## 目录结构（Layout）

```text
src/
  index.ts     入口；运行脚本化演示与评估（Evaluation），随后以状态码 0 退出
  repl.ts      交互式命令解析器（run / eval / help / quit）
  harness.ts   通过钩子总线（Hook Bus）串联的计划／行动／观察循环
  hooks.ts     八事件钩子总线，以及破坏性命令防护机制（Guard）
  model.ts     代替实际大语言模型的确定性脚本（不进行推理）
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

非交互式 `npm start` 执行路径会断言评估报告为 `passed=3, failed=0`，并断言脚本化运行最终收敛到所有事项均已完成的计划。
任何偏离都会使本次运行失败。


## 教学实现的边界

这里的“通过”表示脚本化计划到达预设状态，不表示智能体已经修复代码。模型桩按轮次返回固定的计划和动作；本例没有编辑目标文件，也没有运行修复后的业务验收。工具读取失败也不会自动使最终 `passed` 变为 `false`，因此不能将 `passed=3` 当作三个真实任务完成的证据。

TypeScript 的 `run_shell` 是返回固定格式文本的桩函数，不会启动真正的 shell；同课 Python 版会调用真实 shell，两者在这一点上并不等价。`read_file` 会读取本地文件，路径校验和破坏性命令守卫仅演示部分边界，不能代替生产环境的权限控制。请在临时目录中学习，不要对不可信任务开放重要文件。

钩子总线声明了八类事件，但主循环并未触发全部事件。预算在轮次边界检查，不进行模型调用前的额度预扣；TypeScript 版还在调用模型后检查预算，超限时会将终止状态标为已完成。输出截断和轨迹中的 `bytes` 实际按 JavaScript 字符串长度（UTF-16 代码单元）处理，不是 UTF-8 字节数。观察结果反馈、真实上下文压缩、持久化恢复和生产安全隔离均未实现。

本目录原有的 13 项测试检查计划、预算、钩子、解析、工具接口和部分路径边界。保留这些测试是为了检查教学实现的行为，而不是为其提供生产安全认证。
