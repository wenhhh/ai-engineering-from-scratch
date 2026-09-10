/**
 * 语音活动与轮次结束判断的离线桩。
 * 评分依赖英文标点和按空白切分的词数；话语夹具保持英文，以免改变时长和阈值。
 */

import type { AudioChunk } from "./types.ts";

export function turnCompletionScore(partial: string): number {
  // 用简单规则代替 LiveKit 轮次结束检测模型，不执行模型推理。
  if (!partial) return 0;
  const tail = partial.trimEnd();
  if (tail.endsWith("?") || tail.endsWith(".") || tail.endsWith("!")) return 0.95;
  const n = partial.split(/\s+/).filter(Boolean).length;
  if (n < 3) return 0.2;
  if (n < 6) return 0.55;
  return 0.75;
}

export function synthCall(script: string, startMs = 0, noise = 0): AudioChunk[] {
  // 生成间隔 20 毫秒的模拟“音频”记录：先静音，再逐词加入语音，
  // 最后追加较长静音，使状态机能推进到结束阶段。
  const words = script.trim().split(/\s+/).filter(Boolean);
  const frames: AudioChunk[] = [];
  let t = startMs;
  // 开头六帧共 120 毫秒；noise 为将静音帧标为语音的概率。
  for (let i = 0; i < 6; i++) {
    frames.push({ tMs: t, isSpeech: Math.random() < noise, partial: "" });
    t += 20;
  }
  let partial = "";
  for (const w of words) {
    partial = (partial ? partial + " " : "") + w;
    for (let i = 0; i < 16; i++) {
      frames.push({ tMs: t, isSpeech: true, partial });
      t += 20;
    }
  }
  // 末尾 110 帧共 2200 毫秒静音；不是实际等待或录音。
  for (let i = 0; i < 110; i++) {
    frames.push({ tMs: t, isSpeech: false, partial });
    t += 20;
  }
  return frames;
}
