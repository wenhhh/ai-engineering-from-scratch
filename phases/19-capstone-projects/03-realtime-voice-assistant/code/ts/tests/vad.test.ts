/**
 * 实时语音示例的回归测试。
 * 只翻译名称与注释；话语夹具、事件关键词、测试回调和断言保持不变。
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { synthCall, turnCompletionScore } from "../src/vad.ts";

test("turnCompletionScore：空中间文本返回 0", () => {
  assert.equal(turnCompletionScore(""), 0);
});

test("turnCompletionScore：句末标点触发高完成分数", () => {
  assert.ok(turnCompletionScore("what time is it?") >= 0.9);
  assert.ok(turnCompletionScore("done.") >= 0.9);
  assert.ok(turnCompletionScore("stop!") >= 0.9);
});

test("turnCompletionScore：随按空白切分的词数增加而提高", () => {
  assert.ok(turnCompletionScore("hi") < turnCompletionScore("hello there friend"));
  assert.ok(
    turnCompletionScore("hello there friend") <
      turnCompletionScore("hello there my dear close friend"),
  );
});

test("synthCall：生成依次包含前置静音、语音、尾部静音的帧序列", () => {
  const frames = synthCall("hello world");
  assert.ok(frames.length > 100);
  // 前六帧是前置静音；noise=0，因此 isSpeech 为 false。
  for (let i = 0; i < 6; i++) assert.equal(frames[i].isSpeech, false);
  // 中段帧携带语音标记。
  const speechCount = frames.filter((f) => f.isSpeech).length;
  assert.ok(speechCount >= 16);
  // 末尾为静音。
  assert.equal(frames[frames.length - 1].isSpeech, false);
});

test("synthCall：时间戳以 20 毫秒步长递增", () => {
  const frames = synthCall("hi there");
  for (let i = 1; i < frames.length; i++) {
    assert.equal(frames[i].tMs - frames[i - 1].tMs, 20);
  }
});
