/**
 * 实时语音示例的回归测试。
 * 只翻译名称与注释；话语夹具、事件关键词、测试回调和断言保持不变。
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { decodeFrame, encodeFrame } from "../src/protocol.ts";

test("encodeFrame + decodeFrame：事件帧可往返编解码", () => {
  const f = { type: "event" as const, line: "100ms LISTENING" };
  const raw = encodeFrame(f);
  const back = decodeFrame(raw);
  assert.deepEqual(back, f);
});

test("encodeFrame + decodeFrame：摘要帧可往返编解码", () => {
  const f = {
    type: "summary" as const,
    turnCompleteMs: 1000,
    firstLlmTokenMs: 1200,
    firstAudioOutMs: 1400,
    turnLatencyMs: 400,
    bargeIns: 0,
  };
  const raw = encodeFrame(f);
  const back = decodeFrame(raw);
  assert.deepEqual(back, f);
});

test("decodeFrame：用 Zod 可辨识联合拒绝未知类型", () => {
  assert.throws(() => decodeFrame(JSON.stringify({ type: "garbage" })));
});

test("decodeFrame：拒绝缺少字段的输入", () => {
  assert.throws(() => decodeFrame(JSON.stringify({ type: "summary" })));
});
