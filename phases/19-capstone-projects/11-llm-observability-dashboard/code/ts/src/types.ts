/**
 * GenAI span、逐模型汇总与接收计数器的共享类型。
 * 协议属性名保留英文；start/end_time_unix_nano 为纳秒时间戳，延迟汇总以毫秒计。
 * accepted/rejected 为累计接收／拒绝数量，held 为当前保留数量；类型声明不是完整运行时校验。
 */

export type GenAIOperation = "chat" | "text_completion" | "embeddings";

export type GenAISpan = {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  name: string;
  start_time_unix_nano: number;
  end_time_unix_nano: number;
  status: "OK" | "ERROR";
  attributes: {
    "gen_ai.system": string;
    "gen_ai.request.model": string;
    "gen_ai.operation.name": GenAIOperation;
    "gen_ai.usage.input_tokens"?: number;
    "gen_ai.usage.output_tokens"?: number;
    "gen_ai.usage.cached_input_tokens"?: number;
    "gen_ai.response.model"?: string;
    "gen_ai.response.finish_reasons"?: string[];
    [key: string]: unknown;
  };
};

export type ModelRollup = {
  model: string;
  count: number;
  errors: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
};

export type Counters = { accepted: number; rejected: number; held: number };
