/**
 * 本地 HTTP 与 WebSocket 服务。
 * 每次连接后立即运行固定的离线会话，发送日志与摘要，再关闭连接。
 * 没有接收麦克风音频、WebRTC、背压控制或实际实时播放；也没有鉴权。
 */

import * as http from "node:http";
import { Hono } from "hono";
import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import { runSession, summarize } from "./orchestrator.ts";
import { synthCall } from "./vad.ts";
import { encodeFrame } from "./protocol.ts";

export type ServerHandles = {
  server: http.Server;
  wss: WebSocketServer;
  app: Hono;
};

function nodeListener(app: Hono) {
  return (req: http.IncomingMessage, res: http.ServerResponse): void => {
    const url = `http://${req.headers.host ?? "localhost"}${req.url ?? "/"}`;
    void (async () => {
      try {
        const response = await app.fetch(
          new Request(url, {
            method: req.method,
            headers: req.headers as Record<string, string>,
          }),
        );
        res.statusCode = response.status;
        response.headers.forEach((v, k) => res.setHeader(k, v));
        const body = await response.text();
        res.end(body);
      } catch (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: (err as Error).message }));
      }
    })();
  };
}

function driveSession(ws: WebSocket): void {
  // 固定话语：东京明天天气怎么样？保留英文以维持帧数与评分。
  const frames = synthCall("what is the weather in tokyo tomorrow");
  const m = runSession(frames, {
    useTool: true,
    bargeInAtMs: null,
    onEvent: (line) => ws.send(encodeFrame({ type: "event", line })),
  });
  // 事件推送结束后发送统计摘要；字段名属于协议，不翻译。
  ws.send(encodeFrame({ type: "summary", ...summarize(m) }));
  ws.close();
}

export function buildServer(): ServerHandles {
  const app = new Hono();
  app.get("/healthz", (c) => c.json({ ok: true }));
  // 未知路径返回 404；not found 错误值保持原样。
  app.notFound((c) => c.json({ error: "not found", path: c.req.path }, 404));

  const server = http.createServer(nodeListener(app));
  const wss = new WebSocketServer({ server });
  wss.on("connection", (ws) => {
    driveSession(ws);
  });
  return { server, wss, app };
}
