/**
 * 共享类型定义；所有接口键名与枚举值保持原文。
 * Status：pending 待处理、in_progress 进行中、done 完成、failed 失败。
 * TodoItem/ModelTurn：计划事项和模型单轮结果；ToolCall：工具名及参数。
 * HookEvent/HookPayload：钩子事件和载荷；BudgetSnapshot：预算累计快照。
 * RunResult.passed 只是框架的计划状态判定，不是业务验收结论。
 */

export type Status = "pending" | "in_progress" | "done" | "failed";

export type TodoItem = {
  id: number;
  description: string;
  status: Status;
  note: string;
};

export type HookEvent =
  | "SessionStart"
  | "SessionEnd"
  | "PreToolUse"
  | "PostToolUse"
  | "UserPromptSubmit"
  | "Notification"
  | "Stop"
  | "PreCompact";

export type HookPayload = Record<string, unknown>;
export type HookFn = (payload: HookPayload) => HookPayload;

export type ToolArgs = Record<string, string>;
export type ToolFn = (sandbox: string, args: ToolArgs) => string;
export type ToolCall = { name: string; args: ToolArgs };

export type ModelTurn = {
  plan: TodoItem[];
  tool: ToolCall | null;
  tokens: number;
  cost: number;
};

export type BudgetSnapshot = {
  turnsUsed: number;
  tokensUsed: number;
  dollarsUsed: number;
};

export type RunResult = {
  plan: string;
  budget: BudgetSnapshot;
  trace: HookPayload[];
  passed: boolean;
};
