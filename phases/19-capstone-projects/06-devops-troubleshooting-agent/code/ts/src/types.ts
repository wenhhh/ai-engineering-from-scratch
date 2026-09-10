/**
 * 运维告警、Slack 消息与签名判定的类型定义。
 * Hypothesis 包含排名、摘要、证据和建议处置；AgentReport 汇总事件 ID 与候选假设。
 * OutboundCall 是待发送消息的内存记录；SignatureVerdict 保留英文原因枚举供调用方与测试匹配。
 */

export type Hypothesis = {
  rank: number;
  summary: string;
  evidence: string[];
  remediation: string;
};

export type AgentReport = {
  incidentId: string;
  topHypotheses: Hypothesis[];
};

export type Block = Record<string, unknown>;

export type SlackResponse = {
  response_type: "in_channel" | "ephemeral";
  blocks?: Block[];
  text?: string;
  replace_original?: boolean;
};

export type OutboundCall = {
  url: string;
  body: unknown;
};

export type SignatureVerdict =
  | { ok: true }
  | { ok: false; reason: "bad-timestamp" | "stale" | "length-mismatch" | "mismatch" };
