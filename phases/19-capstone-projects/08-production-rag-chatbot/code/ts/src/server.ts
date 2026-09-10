/**
 * SSE 聊天服务与中文界面；协议事件、JSON 键、查询参数与回答片段原值不变。
 * 没有真实模型调用、Python 集成、角色认证、会话访问控制或提示缓存。/sessions 无认证地列出会话元数据。
 * 中文界面不表示英文关键词检索已支持中文；断开连接只提前返回，可能留下没有助手回复的用户消息。
 */

import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { SessionStore } from "./session.js";
import { encodeSseFrame, retrieve, tokenizeAnswer } from "./stream.js";

const QuerySchema = z.object({
  sessionId: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  jurisdiction: z.string().min(1).optional(),
  q: z.string().min(1),
});

export type AppOptions = {
  sessionStore?: SessionStore;
  tokenDelayMs?: number;
};

function renderClient(): string {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>生产级 RAG 聊天机器人示例</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; color: #222; }
  #log { border: 1px solid #ddd; padding: 1rem; min-height: 200px; white-space: pre-wrap; }
  form { margin-top: 1rem; display: flex; gap: .5rem; }
  input[type=text] { flex: 1; padding: .5rem; }
  .cites { margin-top: 1rem; font-size: .9rem; color: #333; }
</style></head><body>
<h1>综合项目 08：RAG 聊天示例</h1>
<p>角色：<code>analyst</code>（分析人员），策略标签：<code>GDPR</code>。通过 SSE 逐片段传输模拟回答。</p>
<div id="log"></div>
<div class="cites" id="cites"></div>
<form id="f">
  <input type="text" id="q" placeholder="例如：erasure right（检索按英文匹配）" required>
  <button type="submit">发送</button>
</form>
<script>
  const sessionId = "demo-session";
  const role = "analyst";
  const jurisdiction = "GDPR";
  const log = document.getElementById("log");
  const cites = document.getElementById("cites");
  document.getElementById("f").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const q = document.getElementById("q").value;
    log.textContent += "\\n用户：" + q + "\\n助手：";
    cites.textContent = "";
    const url = "/chat/stream?sessionId=" + encodeURIComponent(sessionId)
      + "&role=" + encodeURIComponent(role)
      + "&jurisdiction=" + encodeURIComponent(jurisdiction)
      + "&q=" + encodeURIComponent(q);
    const es = new EventSource(url);
    es.addEventListener("token", (e) => {
      const data = JSON.parse(e.data);
      log.textContent += data.text;
    });
    es.addEventListener("citations", (e) => {
      const data = JSON.parse(e.data);
      cites.textContent = "引用：" + data.items.map((c) => c.docId + " 页码 " + c.page).join(", ");
    });
    es.addEventListener("done", () => { es.close(); });
    es.onerror = () => { es.close(); };
  });
</script></body></html>`;
}

export function buildApp(options: AppOptions = {}): {
  app: Hono;
  sessions: SessionStore;
} {
  const sessions = options.sessionStore ?? new SessionStore();
  const tokenDelayMs = options.tokenDelayMs ?? 0;
  const app = new Hono();

  app.get("/", (c) => c.html(renderClient()));

  app.get("/health", (c) => c.json({ ok: true, sessions: sessions.size() }));

  app.get("/sessions", (c) => {
    const list = sessions.list().map((s) => ({
      id: s.id,
      role: s.role,
      jurisdiction: s.jurisdiction,
      turnCount: s.turns.length,
    }));
    return c.json({ sessions: list });
  });

  app.get("/chat/stream", (c) => {
    const parsed = QuerySchema.safeParse({
      sessionId: c.req.query("sessionId"),
      role: c.req.query("role"),
      jurisdiction: c.req.query("jurisdiction"),
      q: c.req.query("q"),
    });
    if (!parsed.success) {
      // 任何查询校验失败均沿用 missing q 错误，包括存在但不合规则的字段。
      return c.json({ error: "missing q" }, 400);
    }
    const sessionId = parsed.data.sessionId ?? randomUUID();
    const role = parsed.data.role ?? "analyst";
    const jurisdiction = parsed.data.jurisdiction ?? "GDPR";
    const q = parsed.data.q;

    const session = sessions.getOrCreate(sessionId, role, jurisdiction);
    sessions.appendTurn(sessionId, { role: "user", content: q, ts: Date.now() });

    return streamSSE(c, async (stream) => {
      const writeFrame = async (event: string, data: unknown): Promise<void> => {
        await stream.write(encodeSseFrame(event, data));
      };
      await writeFrame("session", {
        sessionId,
        role,
        jurisdiction,
        turn: session.turns.length,
      });
      // 检索只使用本次请求的策略标签，不使用会话原有角色，也没有权限过滤。
      const citations = retrieve(q, jurisdiction, 3);
      await writeFrame("citations", { items: citations });

      const tokens = tokenizeAnswer(q, citations);
      let assembled = "";
      for (const tok of tokens) {
        if (stream.aborted) return;
        assembled += tok;
        await writeFrame("token", { text: tok });
        if (tokenDelayMs > 0) await stream.sleep(tokenDelayMs);
      }
      sessions.appendTurn(sessionId, {
        role: "assistant",
        content: assembled,
        ts: Date.now(),
      });
      // 计数是空白拆分后发送的片段数，不是模型计费词元数。
      await writeFrame("done", { totalTokens: tokens.length });
    });
  });

  app.notFound((c) => c.json({ error: "not found" }, 404));

  return { app, sessions };
}
