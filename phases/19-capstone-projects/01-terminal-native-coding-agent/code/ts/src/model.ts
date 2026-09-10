/**
 * 离线脚本模型：逐轮返回固定计划、工具请求和模拟词元/费用。
 * 任务文字、工具响应和错误都不影响下一步；最后的 done 只是预设状态。
 * 注：超出脚本长度时，此 TypeScript 版返回空计划，Python 版保留传入计划。
 */

import type { ModelTurn, Status, ToolCall, TodoItem } from "./types.ts";
import type { PlanState } from "./plan.ts";

type ScriptStep = {
  plan: ReadonlyArray<readonly [string, Status]>;
  tool: ToolCall | null;
  tokens: number;
  cost: number;
};

const SCRIPT: ScriptStep[] = [
  {
    plan: [
      ["定位目标文件", "in_progress"],
      ["读取并诊断", "pending"],
      ["应用修复并验证（脚本预设状态）", "pending"],
    ],
    tool: { name: "run_shell", args: { cmd: "ls" } },
    tokens: 1200,
    cost: 0.02,
  },
  {
    plan: [
      ["定位目标文件", "done"],
      ["读取并诊断", "in_progress"],
      ["应用修复并验证（脚本预设状态）", "pending"],
    ],
    tool: { name: "read_file", args: { path: "README.md" } },
    tokens: 900,
    cost: 0.02,
  },
  {
    plan: [
      ["定位目标文件", "done"],
      ["读取并诊断", "done"],
      ["应用修复并验证（脚本预设状态）", "done"],
    ],
    tool: null,
    tokens: 600,
    cost: 0.01,
  },
];

export class ScriptedModel {
  step(_plan: PlanState, turn: number): ModelTurn {
    if (turn >= SCRIPT.length) {
      return { plan: [], tool: null, tokens: 200, cost: 0.005 };
    }
    const s = SCRIPT[turn];
    const items: TodoItem[] = s.plan.map(([description, status], i) => ({
      id: i + 1,
      description,
      status,
      note: "",
    }));
    return { plan: items, tool: s.tool, tokens: s.tokens, cost: s.cost };
  }

  scriptLength(): number {
    return SCRIPT.length;
  }
}
