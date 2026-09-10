/**
 * 进程内掌握度存储。
 * score 是此前分数与累计答对比例的加权平滑，不是 Python 示例的贝叶斯知识追踪公式。
 * all/get/peek 返回内部对象引用，没有学习者隔离、持久化或不可变快照。
 */

import type { Mastery } from "./types.js";
import { BASE_INTERVAL_MS } from "./types.js";
import { scheduleNextDue } from "./repetition.js";

export class MasteryStore {
  private rows: Record<string, Mastery> = {};

  get(id: string): Mastery {
    let m = this.rows[id];
    if (!m) {
      m = {
        score: 0,
        attempts: 0,
        successes: 0,
        next_due_at: 0,
        interval_ms: BASE_INTERVAL_MS,
      };
      this.rows[id] = m;
    }
    return m;
  }

  peek(id: string): Mastery | undefined {
    return this.rows[id];
  }

  all(): Record<string, Mastery> {
    return this.rows;
  }

  record(id: string, correct: boolean, now: number): Mastery {
    const m = this.get(id);
    m.attempts += 1;
    if (correct) m.successes += 1;
    const observed = m.successes / m.attempts;
    m.score = 0.3 * m.score + 0.7 * observed;
    const next = scheduleNextDue(m.interval_ms, correct, now);
    m.interval_ms = next.interval_ms;
    m.next_due_at = next.next_due_at;
    return m;
  }
}
