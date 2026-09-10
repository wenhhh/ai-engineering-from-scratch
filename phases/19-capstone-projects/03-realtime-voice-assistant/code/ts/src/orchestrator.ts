/**
 * 模拟语音会话调度器：逐帧处理状态、工具阶段与插话。
 * 事件文本会通过 WebSocket 发送并被测试匹配，保留英文；下面提供对应中文注释。
 * 各延迟来自预设帧时间戳，不是真实 ASR、LLM 或 TTS 的性能。
 * 插话会重置部分调度状态，但首次词元／音频时间未逐轮清空，不能当作完整多轮指标。
 */

import type {
  AudioChunk,
  Metrics,
  SessionOptions,
  SessionSummary,
  State,
  Tool,
} from "./types.ts";
import { turnCompletionScore } from "./vad.ts";

export const WEATHER: Tool = {
  name: "weather.tokyo_tomorrow",
  latencyMs: 420,
  // 固定天气结果：68/52，局部多云；原值未注明温标。
  result: "68/52 partly cloudy",
};

export function newMetrics(): Metrics {
  return {
    events: [],
    turnCompleteMs: 0,
    firstLlmTokenMs: 0,
    firstAudioOutMs: 0,
    bargeIns: 0,
  };
}

export function turnLatencyMs(m: Metrics): number {
  if (m.turnCompleteMs && m.firstAudioOutMs) return m.firstAudioOutMs - m.turnCompleteMs;
  return -1;
}

export function summarize(m: Metrics): SessionSummary {
  return {
    turnCompleteMs: m.turnCompleteMs,
    firstLlmTokenMs: m.firstLlmTokenMs,
    firstAudioOutMs: m.firstAudioOutMs,
    turnLatencyMs: turnLatencyMs(m),
    bargeIns: m.bargeIns,
  };
}

export function runSession(frames: AudioChunk[], opts: SessionOptions): Metrics {
  const m = newMetrics();
  let state: State = "IDLE";
  let silenceRunMs = 0;
  let finalPartial = "";
  let llmStartedAt = -1;
  let ttsStartedAt = -1;
  let toolStartedAt = -1;
  let fillerEmitted = false;
  let toolPhase: "none" | "running" | "done" = "none";

  const log = (line: string): void => {
    m.events.push(line);
    opts.onEvent?.(line);
  };

  for (const f of frames) {
    if (
      opts.bargeInAtMs !== null &&
      f.tMs >= opts.bargeInAtMs &&
      (state === "SPEAKING" || state === "THINKING") &&
      f.isSpeech
    ) {
      m.bargeIns += 1;
      // 事件：用户插话，取消模拟 TTS 并重新准备 ASR；实际上只重置内存状态。
      log(`${f.tMs}ms BARGE-IN: cancel TTS, re-arm ASR`);
      state = "LISTENING";
      silenceRunMs = 0;
      finalPartial = "";
      toolPhase = "none";
      toolStartedAt = -1;
      fillerEmitted = false;
      ttsStartedAt = -1;
      llmStartedAt = -1;
      continue;
    }

    if (state === "IDLE") {
      if (f.isSpeech) {
        state = "LISTENING";
        // 事件：开始倾听。
        log(`${f.tMs}ms LISTENING`);
      }
      continue;
    }

    if (state === "LISTENING") {
      if (f.isSpeech) {
        silenceRunMs = 0;
        finalPartial = f.partial || finalPartial;
      } else {
        silenceRunMs += 20;
        if (silenceRunMs >= 500) {
          const score = turnCompletionScore(finalPartial);
          if (score >= 0.6) {
            state = "WAITING";
            m.turnCompleteMs = f.tMs;
            log(
              // 事件：轮次完成，记录评分与识别文本。
              `${f.tMs}ms TURN COMPLETE (score=${score.toFixed(2)}) partial='${finalPartial}'`,
            );
          } else {
            // 事件：静音但评分不足，继续等待。
            log(`${f.tMs}ms SILENCE but score=${score.toFixed(2)}, waiting`);
          }
        }
      }
    }

    if (state === "WAITING") {
      if (opts.useTool && toolPhase === "none") {
        toolStartedAt = f.tMs;
        toolPhase = "running";
        // 事件：触发模拟工具调用。
        log(`${f.tMs}ms tool call fired: ${WEATHER.name}`);
        state = "THINKING";
      } else {
        llmStartedAt = f.tMs + 140;
        state = "THINKING";
        // 事件：触发模拟 LLM 调用。
        log(`${f.tMs}ms LLM call fired`);
      }
      continue;
    }

    if (state === "THINKING") {
      if (toolPhase === "running") {
        if (!fillerEmitted && f.tMs - toolStartedAt >= 300) {
          fillerEmitted = true;
          // 等待超过 300 毫秒时记录填充语：“稍等，我查一下”。
          log(`${f.tMs}ms filler 'one second, let me check'`);
        }
        if (f.tMs - toolStartedAt >= WEATHER.latencyMs) {
          toolPhase = "done";
          // 事件：模拟工具结果到达。
          log(`${f.tMs}ms tool result: ${WEATHER.result}`);
          llmStartedAt = f.tMs + 140;
        }
      } else if (llmStartedAt > 0 && f.tMs >= llmStartedAt) {
        if (m.firstLlmTokenMs === 0) {
          m.firstLlmTokenMs = f.tMs;
          // 事件：模拟首个 LLM 词元到达。
          log(`${f.tMs}ms LLM first token`);
        }
        ttsStartedAt = f.tMs + 180;
        state = "SPEAKING";
      }
      continue;
    }

    if (state === "SPEAKING") {
      if (ttsStartedAt > 0 && f.tMs >= ttsStartedAt && m.firstAudioOutMs === 0) {
        m.firstAudioOutMs = f.tMs;
        // 事件：模拟首次音频输出。
        log(`${f.tMs}ms TTS first audio-out`);
      }
    }
  }
  return m;
}

export function renderToConsole(label: string, m: Metrics): void {
  console.log(`=== ${label} ===`);
  for (const line of m.events) console.log(" ", line);
  console.log(`  轮次完成时间：${m.turnCompleteMs}ms`);
  console.log(`  首个 LLM 词元：${m.firstLlmTokenMs}ms`);
  console.log(`  首次音频输出：${m.firstAudioOutMs}ms`);
  console.log(`  轮次延迟：${turnLatencyMs(m)}ms`);
  console.log(`  插话次数：${m.bargeIns}`);
  console.log("");
}
