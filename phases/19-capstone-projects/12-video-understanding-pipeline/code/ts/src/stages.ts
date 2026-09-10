/**
 * 按经过时间推算作业阶段，不执行分块、嵌入、索引或问答。
 * 阶段耗时为固定配置；detail 是面向读者的说明，机器 stage/status 保留英文。
 * 该逻辑假设时间向前推进：回拨时钟不会清理全部旧时间戳，不能当作持久任务恢复实现。
 */

import type { Job, StageStatus } from "./types.js";
import { STAGE_DURATIONS_MS } from "./types.js";

export function advanceJob(job: Job, nowOverride?: number): void {
  const now = nowOverride ?? Date.now();
  let elapsed = now - job.created_at;
  let priorOffset = 0;
  for (const slot of job.stages) {
    const dur = STAGE_DURATIONS_MS[slot.stage];
    if (elapsed <= 0) {
      slot.status = "pending";
      continue;
    }
    if (elapsed < dur) {
      slot.status = "running";
      slot.started_at = job.created_at + priorOffset;
      slot.detail = `${Math.round((elapsed / dur) * 100)}%：${slot.stage} 阶段进度`;
      break;
    }
    slot.status = "done";
    slot.started_at = job.created_at + priorOffset;
    slot.finished_at = slot.started_at + dur;
    slot.detail = `${slot.stage} 阶段已完成，预设耗时 ${dur} 毫秒`;
    priorOffset += dur;
    elapsed -= dur;
  }
}

export function overallStatus(job: Job): StageStatus {
  if (job.stages.some((s) => s.status === "error")) return "error";
  if (job.stages.every((s) => s.status === "done")) return "done";
  if (job.stages.some((s) => s.status === "running")) return "running";
  return "pending";
}
