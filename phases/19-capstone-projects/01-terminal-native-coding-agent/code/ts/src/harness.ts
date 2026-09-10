/**
 * 终端智能体的计划／行动／观察循环，使用脚本模型和可插拔钩子。
 * 记录工具结果，但没有把结果反馈给下一轮模型；脚本仍按预设状态前进。
 * passed 只取决于 completed 与全 done 计划；工具读取失败也可能返回 true。
 * 预算耗尽分支同样会设 completed=true，不能把 passed 当作独立验收结论。
 */

import { Budget, PlanState } from "./plan.ts";
import { HookBus, destructiveGuard } from "./hooks.ts";
import { ScriptedModel } from "./model.ts";
import { TOOLS } from "./tools.ts";
import type { HookPayload, RunResult } from "./types.ts";

export function runAgent(task: string, sandbox: string): RunResult {
  const plan = new PlanState(task);
  const budget = new Budget();
  const hooks = new HookBus();
  const trace: HookPayload[] = [];
  const model = new ScriptedModel();

  hooks.on("PreToolUse", destructiveGuard);
  hooks.on("PostToolUse", (p) => {
    trace.push({ event: "tool", ...p });
    return p;
  });
  hooks.on("SessionStart", (p) => {
    trace.push({ event: "start", ...p });
    return p;
  });
  hooks.on("SessionEnd", (p) => {
    trace.push({ event: "end", ...p });
    return p;
  });
  hooks.on("Stop", (p) => {
    trace.push({ event: "stop", ...p });
    return p;
  });

  hooks.fire("SessionStart", { task, sandbox, startedAt: Date.now() });

  let turn = 0;
  let completed = false;
  while (true) {
    const limit = budget.exceeded();
    if (limit) {
      hooks.fire("Stop", { reason: limit, turn });
      break;
    }
    // 模型调用前检查上一轮累计预算；调用后再检查本轮累计值，不是预扣模型费用。
    const step = model.step(plan, turn);
    plan.rewrite(step.plan);
    budget.step(step.tokens, step.cost);

    // 本轮计量已入账；若达到上限，在工具执行前停止。此行为与 Python 版不同。
    const postStepLimit = budget.exceeded();
    if (postStepLimit) {
      hooks.fire("Stop", { reason: "budget", turn });
      completed = true;
      break;
    }

    if (step.tool === null) {
      hooks.fire("Stop", { reason: "complete", turn });
      completed = true;
      break;
    }

    const { name, args } = step.tool;
    const pre = hooks.fire("PreToolUse", { tool: name, args });
    if (pre.blocked) {
      hooks.fire("PostToolUse", {
        tool: name,
        blocked: true,
        reason: String(pre.reason ?? ""),
      });
      turn += 1;
      continue;
    }

    try {
      const result = TOOLS[name](sandbox, args);
      // 字段名仍为 bytes，但字符串 length 统计 UTF-16 代码单元，不是 UTF-8 字节。
      hooks.fire("PostToolUse", { tool: name, ok: true, bytes: result.length });
    } catch (err) {
      const e = err as Error;
      // 工具失败只写入轨迹，不阻止后续脚本把计划标为 done。
      hooks.fire("PostToolUse", { tool: name, ok: false, error: e.message });
    }
    turn += 1;
  }

  hooks.fire("SessionEnd", budget.snapshot() as unknown as HookPayload);

  const allDone =
    plan.items.length > 0 && plan.items.every((it) => it.status === "done");
  return {
    plan: plan.summary(),
    budget: budget.snapshot(),
    trace,
    passed: completed && allDone,
  };
}
