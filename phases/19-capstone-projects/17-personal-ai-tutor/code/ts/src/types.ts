/**
 * 课程、掌握度、选择结果与调度常量。
 * new_eligible＝先修满足且尚未掌握；review_overdue＝到期复习。
 * score 是本 TS 示例的平滑分数，MASTERY_THRESHOLD=0.7 与 Python 的阈值不同。
 */

export type Lesson = { id: string; title: string; prereqs: string[] };

export type Mastery = {
  score: number;
  attempts: number;
  successes: number;
  next_due_at: number;
  interval_ms: number;
};

export type PickReason = "new_eligible" | "review_overdue";

export type Pick = { lesson: Lesson; reason: PickReason };

export const MASTERY_THRESHOLD = 0.7;
export const BASE_INTERVAL_MS = 1000 * 60 * 60 * 24;
