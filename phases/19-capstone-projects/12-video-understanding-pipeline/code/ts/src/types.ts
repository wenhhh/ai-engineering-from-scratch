/**
 * 视频流水线的共享类型和预设阶段耗时。
 * chunk（分块）、embed（嵌入）、index（索引）、qa（问答）是固定机器标识。
 * pending/running/done/error 分别表示待处理／进行中／完成／错误；时刻与耗时均以毫秒计。
 * 这些配置只控制演示时间线，不是实际视频处理性能测量。
 */

export type Stage = "chunk" | "embed" | "index" | "qa";

export type StageStatus = "pending" | "running" | "done" | "error";

export type StageState = {
  stage: Stage;
  status: StageStatus;
  started_at?: number;
  finished_at?: number;
  detail?: string;
};

export type Job = {
  id: string;
  video_url: string;
  question: string;
  created_at: number;
  stages: StageState[];
};

export const STAGES: Stage[] = ["chunk", "embed", "index", "qa"];

export const STAGE_DURATIONS_MS: Record<Stage, number> = {
  chunk: 1200,
  embed: 2400,
  index: 800,
  qa: 1600,
};
