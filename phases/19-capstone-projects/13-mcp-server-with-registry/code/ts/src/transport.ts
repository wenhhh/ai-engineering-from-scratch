/**
 * 逐行 JSON-RPC 传输与夹具重放。
 * 空行被忽略；通知不回复。Invalid Request 表示请求信封无效，Parse error 表示 JSON 解析失败。
 * stdio 模式只输出协议行，不夹杂翻译说明；没有实现网络传输、认证或单行长度限制。
 */

import { createInterface } from "node:readline";
import type { JsonRpcRequest, JsonRpcResponse } from "./types.js";
import { dispatch, parseRpc, type ServerContext } from "./protocol.js";

export type LineSink = (line: string) => void;

export function processLine(context: ServerContext, line: string, sink: LineSink): void {
  const trimmed = line.trim();
  if (!trimmed) return;
  const parsed = parseRpc(trimmed);
  if (!parsed.ok) {
    const message = parsed.code === -32600 ? "Invalid Request" : "Parse error";
    const err: JsonRpcResponse = {
      jsonrpc: "2.0",
      id: null,
      error: { code: parsed.code, message, data: parsed.err },
    };
    sink(JSON.stringify(err));
    return;
  }
  const resp = dispatch(context, parsed.msg);
  if (resp) sink(JSON.stringify(resp));
}

export function replayFixture(
  context: ServerContext,
  messages: JsonRpcRequest[],
): JsonRpcResponse[] {
  const out: JsonRpcResponse[] = [];
  for (const msg of messages) {
    const reply = dispatch(context, msg);
    if (reply) out.push(reply);
  }
  return out;
}

export function serveStdio(context: ServerContext): void {
  const rl = createInterface({ input: process.stdin, terminal: false });
  const sink: LineSink = (line) => process.stdout.write(line + "\n");
  rl.on("line", (line) => {
    processLine(context, line, sink);
  });
}
