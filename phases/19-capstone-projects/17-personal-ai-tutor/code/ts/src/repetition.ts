/**
 * 简化间隔重复调度：答对则翻倍，答错则减半，并限制为一分钟至三十天。
 * 没有 FSRS 的可学习参数、记忆稳定性或难度模型，不能当作真实 FSRS 实现。
 */

import { BASE_INTERVAL_MS } from "./types.js";

export const MIN_INTERVAL_MS = 60_000;
export const MAX_INTERVAL_MS = BASE_INTERVAL_MS * 30;

export function scheduleNextDue(
  currentInterval: number,
  correct: boolean,
  now: number,
): { interval_ms: number; next_due_at: number } {
  const nextInterval = correct
    ? Math.min(currentInterval * 2, MAX_INTERVAL_MS)
    : Math.max(Math.floor(currentInterval / 2), MIN_INTERVAL_MS);
  return { interval_ms: nextInterval, next_due_at: now + nextInterval };
}
