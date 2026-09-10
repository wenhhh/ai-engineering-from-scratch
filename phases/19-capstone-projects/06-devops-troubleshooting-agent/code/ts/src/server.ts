/**
 * Slack 斜杠命令与按钮交互的 Hono 路由。
 * 先验签，再解析请求体；响应和待发送消息写入内存日志，没有向 Slack 发起请求。
 * 英文错误、签名头、动作 ID 和响应字段保留原值；没有审批者权限检查、审批记录去重或真实修复。
 */

import { Hono } from "hono";
import { z } from "zod";
import { verifySlackSignature } from "./slack_verify.js";
import { mockAgent } from "./agent.js";
import { actionReply, buildSlackResponse } from "./blocks.js";
import type { OutboundCall } from "./types.js";

const InteractivitySchema = z.object({
  actions: z
    .array(
      z.object({
        action_id: z.string().optional(),
        value: z.string().optional(),
      }),
    )
    .optional(),
  response_url: z.string().optional(),
});

export type AppOptions = {
  signingSecret?: string;
  outboundLog?: OutboundCall[];
  now?: () => number;
};

export function buildApp(options: AppOptions = {}): {
  app: Hono;
  outboundLog: OutboundCall[];
} {
  const signingSecret = options.signingSecret || process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    // 没有签名密钥时拒绝创建应用；入口的默认测试密钥仅用于本地教学。
    throw new Error("SLACK_SIGNING_SECRET is required");
  }
  const outboundLog: OutboundCall[] = options.outboundLog ?? [];
  const now = options.now ?? (() => Math.floor(Date.now() / 1000));
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true, outboundCount: outboundLog.length }));

  app.post("/slack/command", async (c) => {
    const rawBody = await c.req.text();
    const timestamp = c.req.header("x-slack-request-timestamp") ?? "";
    const signature = c.req.header("x-slack-signature") ?? "";
    const verdict = verifySlackSignature({
      signingSecret,
      timestamp,
      signature,
      rawBody,
      nowSeconds: now(),
    });
    if (!verdict.ok) {
      return c.json({ error: `signature ${verdict.reason}` }, 401);
    }
    const params = new URLSearchParams(rawBody);
    const text = params.get("text") ?? "";
    const responseUrl = params.get("response_url") ?? "";
    const report = mockAgent(text);
    const payload = buildSlackResponse(report);
    if (responseUrl) {
      outboundLog.push({ url: responseUrl, body: payload });
    }
    return c.json({
      response_type: "ephemeral",
      text: `正在排查事件，后续结果记录到 <${responseUrl || "channel"}>（本例仅保存在内存）。`,
    });
  });

  app.post("/slack/interactivity", async (c) => {
    const rawBody = await c.req.text();
    const timestamp = c.req.header("x-slack-request-timestamp") ?? "";
    const signature = c.req.header("x-slack-signature") ?? "";
    const verdict = verifySlackSignature({
      signingSecret,
      timestamp,
      signature,
      rawBody,
      nowSeconds: now(),
    });
    if (!verdict.ok) {
      return c.json({ error: `signature ${verdict.reason}` }, 401);
    }
    const params = new URLSearchParams(rawBody);
    const payloadStr = params.get("payload") ?? "{}";
    let parsed: z.infer<typeof InteractivitySchema>;
    try {
      parsed = InteractivitySchema.parse(JSON.parse(payloadStr));
    } catch {
      // 交互载荷不合规则时返回 400，错误值保持英文。
      return c.json({ error: "bad interactivity payload" }, 400);
    }
    const action = parsed.actions?.[0] ?? {};
    // 只读取首个动作，缺失时标为 unknown；下游会将未知动作按忽略处理。
    const actionId = action.action_id ?? "unknown";
    const incidentId = action.value ?? "unknown";
    const reply = actionReply(actionId, incidentId);
    if (parsed.response_url) {
      outboundLog.push({ url: parsed.response_url, body: { text: reply.text } });
    }
    return c.json(reply);
  });

  app.notFound((c) => c.json({ error: "not found" }, 404));

  return { app, outboundLog };
}
