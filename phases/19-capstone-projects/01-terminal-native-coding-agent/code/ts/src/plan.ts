/**
 * 计划与预算状态。
 * PlanState 重写时复制每一项；摘要中的 [x]、[>] 等标记是测试和评估契约。
 * Budget 累计轮次、词元与美元费用；金额为示例输入，不是实际 API 计费。
 */

import type { Status, TodoItem } from "./types.ts";

export class PlanState {
  goal: string;
  items: TodoItem[];

  constructor(goal: string) {
    this.goal = goal;
    this.items = [];
  }

  rewrite(items: TodoItem[]): void {
    this.items = items.map((it) => ({ ...it }));
  }

  summary(): string {
    const mark: Record<Status, string> = {
      pending: " ",
      in_progress: ">",
      done: "x",
      failed: "!",
    };
    const lines = [`目标：${this.goal}`];
    for (const it of this.items) {
      lines.push(`  [${mark[it.status]}] ${it.id}. ${it.description}`);
    }
    return lines.join("\n");
  }
}

export class Budget {
  maxTurns = 50;
  maxTokens = 200_000;
  maxDollars = 5.0;
  turnsUsed = 0;
  tokensUsed = 0;
  dollarsUsed = 0;

  step(tokens: number, dollars: number): void {
    if (tokens < 0 || dollars < 0) {
      // 错误含义：tokens 与 dollars 不得为负；原英文消息保持不变。
      throw new RangeError("Budget.step requires non-negative tokens and dollars");
    }
    this.turnsUsed += 1;
    this.tokensUsed += tokens;
    this.dollarsUsed += dollars;
  }

  exceeded(): string | null {
    // 限制原因枚举：turn_limit 为轮次上限，token_limit 为词元上限，dollar_limit 为费用上限。
    if (this.turnsUsed >= this.maxTurns) return "turn_limit";
    if (this.tokensUsed >= this.maxTokens) return "token_limit";
    if (this.dollarsUsed >= this.maxDollars) return "dollar_limit";
    return null;
  }

  snapshot(): { turnsUsed: number; tokensUsed: number; dollarsUsed: number } {
    return {
      turnsUsed: this.turnsUsed,
      tokensUsed: this.tokensUsed,
      dollarsUsed: this.dollarsUsed,
    };
  }
}
