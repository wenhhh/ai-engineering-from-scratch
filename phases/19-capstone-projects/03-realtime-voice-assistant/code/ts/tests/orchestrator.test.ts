/**
 * 实时语音示例的回归测试。
 * 只翻译名称与注释；话语夹具、事件关键词、测试回调和断言保持不变。
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { runSession, summarize, turnLatencyMs } from "../src/orchestrator.ts";
import { synthCall } from "../src/vad.ts";

test("runSession：无插话会话得到工具结果并到达首次音频输出", () => {
  const m = runSession(synthCall("what is the weather in tokyo tomorrow"), {
    useTool: true,
    bargeInAtMs: null,
  });
  assert.ok(m.turnCompleteMs > 0);
  assert.ok(m.firstLlmTokenMs > 0);
  assert.ok(m.firstAudioOutMs > 0);
  assert.ok(m.events.some((e) => e.includes("tool call fired")));
  assert.ok(m.events.some((e) => e.includes("tool result")));
});

test("runSession：插话增加 bargeIns 并重新准备 ASR", () => {
  const frames = synthCall("tell me a long story about");
  for (let i = 0; i < 8; i++) {
    const idx = frames.length - 20 + i;
    if (idx >= 0 && idx < frames.length) {
      frames[idx] = { tMs: frames[idx].tMs, isSpeech: true, partial: frames[idx].partial };
    }
  }
  const m = runSession(frames, {
    useTool: false,
    bargeInAtMs: frames[frames.length - 20].tMs - 60,
  });
  assert.ok(m.bargeIns >= 1);
});

test("turnLatencyMs：尚无首次音频输出时返回 -1", () => {
  const m = {
    events: [],
    turnCompleteMs: 0,
    firstLlmTokenMs: 0,
    firstAudioOutMs: 0,
    bargeIns: 0,
  };
  assert.equal(turnLatencyMs(m), -1);
});

test("turnLatencyMs：两个时间戳齐备时计算正向差值", () => {
  const m = {
    events: [],
    turnCompleteMs: 1000,
    firstLlmTokenMs: 1200,
    firstAudioOutMs: 1380,
    bargeIns: 0,
  };
  assert.equal(turnLatencyMs(m), 380);
});

test("summarize：生成包含轮次延迟的统计摘要", () => {
  const m = runSession(synthCall("hello"), { useTool: false, bargeInAtMs: null });
  const s = summarize(m);
  assert.equal(typeof s.turnLatencyMs, "number");
  assert.equal(s.bargeIns, m.bargeIns);
});
