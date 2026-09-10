/**
 * 轮次与费用预算：先累计一次模拟费用，再由调用方检查是否耗尽。
 * 费用来自随机公式，不是 API 实际账单。turns、cost 是机器原因码，保留英文。
 */

import type { Migration } from "./types.js";

export const MAX_TURNS = 20;
export const BUDGET_USD = 8;

export function turnCostUsd(rng: () => number = Math.random): number {
  return Number((0.06 + rng() * 0.18).toFixed(3));
}

export type BudgetVerdict = {
  exhausted: boolean;
  reason?: "turns" | "cost";
};

export function checkBudget(m: Migration): BudgetVerdict {
  if (m.turns >= m.maxTurns) {
    return { exhausted: true, reason: "turns" };
  }
  if (m.spentUsd >= m.budgetUsd) {
    return { exhausted: true, reason: "cost" };
  }
  return { exhausted: false };
}

export function chargeTurn(m: Migration, rng: () => number = Math.random): void {
  m.turns += 1;
  m.spentUsd = Number((m.spentUsd + turnCostUsd(rng)).toFixed(3));
}
