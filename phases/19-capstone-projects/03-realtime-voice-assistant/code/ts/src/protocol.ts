/**
 * WebSocket 消息封装：事件帧与统计摘要帧。
 * event 携带日志行；summary 携带时间和插话计数。type 字段用于 Zod 可辨识联合校验。
 * encodeFrame 只做 JSON 序列化，运行时结构校验发生在 decodeFrame。
 */

import { z } from "zod";

export const EventFrame = z.object({
  type: z.literal("event"),
  line: z.string(),
});
export type EventFrame = z.infer<typeof EventFrame>;

export const SummaryFrame = z.object({
  type: z.literal("summary"),
  turnCompleteMs: z.number(),
  firstLlmTokenMs: z.number(),
  firstAudioOutMs: z.number(),
  turnLatencyMs: z.number(),
  bargeIns: z.number(),
});
export type SummaryFrame = z.infer<typeof SummaryFrame>;

export const Frame = z.discriminatedUnion("type", [EventFrame, SummaryFrame]);
export type Frame = z.infer<typeof Frame>;

export function encodeFrame(f: Frame): string {
  return JSON.stringify(f);
}

// 先解析 JSON，再校验结构；未知类型或缺少字段时抛出原有异常。
export function decodeFrame(raw: string): Frame {
  return Frame.parse(JSON.parse(raw));
}
