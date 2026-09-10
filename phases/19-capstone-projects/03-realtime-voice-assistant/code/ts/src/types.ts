/**
 * 实时语音调度的类型定义。
 * State：空闲、倾听、等待、思考、播报；英文枚举参与状态分支，保留原值。
 * AudioChunk：毫秒时间戳、是否为语音、累积识别文本；没有真实音频样本。
 * Metrics / SessionSummary 保存事件、轮次完成、首词元、首音频和插话计数。
 */

export type State = "IDLE" | "LISTENING" | "WAITING" | "THINKING" | "SPEAKING";

export type AudioChunk = {
  tMs: number;
  isSpeech: boolean;
  partial: string;
};

export type Tool = { name: string; latencyMs: number; result: string };

export type Metrics = {
  events: string[];
  turnCompleteMs: number;
  firstLlmTokenMs: number;
  firstAudioOutMs: number;
  bargeIns: number;
};

export type SessionOptions = {
  useTool: boolean;
  bargeInAtMs: number | null;
  onEvent?: (line: string) => void;
};

export type SessionSummary = {
  turnCompleteMs: number;
  firstLlmTokenMs: number;
  firstAudioOutMs: number;
  turnLatencyMs: number;
  bargeIns: number;
};
