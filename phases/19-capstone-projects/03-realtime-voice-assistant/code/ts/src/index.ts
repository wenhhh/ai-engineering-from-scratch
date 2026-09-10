/**
 * 离线语音调度演示与本机 WebSocket 自探测。
 * 探测收到 summary 只代表消息传输成功，不证明真实语音链路可用。错误与协议值保持英文。
 */

// 综合项目 19/03：实时语音客户端示例框架（多文件 TypeScript 版本）。
//
// 固定原文参考：
//   本课 docs/en.md：WebRTC 客户端、VAD 与插话交互设计；本代码并未实现 WebRTC。
//   RFC 6455 WebSocket 协议     https://datatracker.ietf.org/doc/html/rfc6455
//   ws（Node WebSocket 库）     https://github.com/websockets/ws
//   Silero VAD v5 模型卡        https://github.com/snakers4/silero-vad
//
// 模块职责：vad.ts 负责轮次评分与合成帧；orchestrator.ts 负责带插话处理的状态机；
// protocol.ts 定义经 Zod 校验的消息封装；server.ts 提供 /healthz 与 WebSocket 升级。
// 本入口运行两个离线会话，启动本地 WebSocket 服务，完成探测后退出。

import WebSocket from "ws";
import { runSession, renderToConsole, summarize } from "./orchestrator.ts";
import { synthCall } from "./vad.ts";
import { decodeFrame } from "./protocol.ts";
import { buildServer } from "./server.ts";
import type { Frame } from "./protocol.ts";

async function probeWs(
  port: number,
  timeoutMs = 3000,
): Promise<{ events: number; gotSummary: boolean }> {
  return await new Promise<{ events: number; gotSummary: boolean }>((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    let events = 0;
    let gotSummary = false;
    let settled = false;
    const finish = (val: { events: number; gotSummary: boolean }): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(val);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      ws.removeAllListeners();
      try {
        ws.close();
      } catch {
        // 连接已处于关闭过程中。
      }
      finish({ events, gotSummary });
    }, timeoutMs);
    ws.on("message", (raw) => {
      try {
        const f: Frame = decodeFrame(raw.toString("utf8"));
        if (f.type === "event") events += 1;
        else if (f.type === "summary") gotSummary = true;
      } catch {
        // 探测时忽略格式不正确的帧。
      }
    });
    ws.on("close", () => finish({ events, gotSummary }));
    ws.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function main(): Promise<void> {
  // 预检查：用两个离线会话驱动状态机。
  // 固定话语：东京明天天气怎么样？保留英文以维持时序。
  const clean = runSession(synthCall("what is the weather in tokyo tomorrow"), {
    useTool: true,
    bargeInAtMs: null,
  });
  renderToConsole("会话 1：无插话，使用天气工具", clean);
  if (clean.turnCompleteMs <= 0 || clean.firstAudioOutMs <= 0) {
    throw new Error("clean session did not reach first audio-out");
  }

  // 固定话语：给我讲一个关于……的长故事。随后在静音末段加入插话帧。
  const bargeFrames = synthCall("tell me a long story about");
  if (bargeFrames.length === 0) {
    throw new Error("synthCall returned no frames");
  }
  const anchorIdx = Math.max(0, bargeFrames.length - 20);
  const anchorFrame = bargeFrames[anchorIdx] ?? bargeFrames[bargeFrames.length - 1];
  for (let i = 0; i < 8; i++) {
    const idx = anchorIdx + i;
    if (idx >= 0 && idx < bargeFrames.length) {
      bargeFrames[idx] = {
        tMs: bargeFrames[idx].tMs,
        isSpeech: true,
        partial: bargeFrames[idx].partial,
      };
    }
  }
  const bargeIn = runSession(bargeFrames, {
    useTool: false,
    bargeInAtMs: anchorFrame.tMs - 60,
  });
  renderToConsole("会话 2：用户在回答过程中插话", bargeIn);
  if (bargeIn.bargeIns === 0) {
    throw new Error("barge-in session did not register any barge-in event");
  }

  // 启动实际 WebSocket 服务，传输一段模拟会话，再关闭服务。
  const { server } = buildServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("address unavailable");
  console.log(`语音客户端示例框架 ws://127.0.0.1:${addr.port}`);
  if (process.argv.includes("--serve")) {
    process.on("SIGINT", () => server.close(() => process.exit(0)));
    return;
  }
  const probe = await probeWs(addr.port);
  console.log(`[WebSocket 探测] 收到帧数：${probe.events + (probe.gotSummary ? 1 : 0)}`);
  console.log(`[WebSocket 探测] 摘要：${probe.gotSummary ? "已收到" : "缺失"}`);
  console.log(`[WebSocket 探测] 示例摘要：${JSON.stringify(summarize(clean))}`);
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (!probe.gotSummary) throw new Error("ws probe did not receive summary frame");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
