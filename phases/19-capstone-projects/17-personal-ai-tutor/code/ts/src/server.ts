/**
 * 课程 HTTP API；课程标题与提示中文化，机器字段和错误字符串保持原值。
 * 所有请求共用同一个内存 MasteryStore，没有登录或按学习者隔离；correct 由调用方自行声明，
 * 代码不评阅答案。done 只表示选择器当前返回 null，不证明课程永久完成。
 * unknown lesson＝未知课程；invalid body＝JSON 解析失败；invalid payload＝载荷结构无效。
 */

import { Hono } from "hono";
import { buildIndex, CURRICULUM, pickNextLesson, topoOrder } from "./curriculum.js";
import type { MasteryStore } from "./mastery.js";

export function buildApp(mastery: MasteryStore): Hono {
  const app = new Hono();
  const index = buildIndex(CURRICULUM);
  const topo = topoOrder(CURRICULUM);

  app.get("/lesson/next", (c) => {
    const pick = pickNextLesson(topo, index, mastery.all(), Date.now());
    if (!pick) return c.json({ done: true, message: "当前没有符合条件的新课或到期复习" });
    return c.json({
      lesson: pick.lesson,
      reason: pick.reason,
      mastery: mastery.peek(pick.lesson.id) ?? null,
    });
  });

  app.post("/lesson/:id/submit", async (c) => {
    const id = c.req.param("id");
    if (!index[id]) return c.json({ error: "unknown lesson", id }, 404);
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch (err) {
      return c.json({ error: "invalid body", detail: String(err) }, 400);
    }
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      // 请求错误：请求体必须是 JSON 对象。
      return c.json({ error: "invalid payload", detail: "body must be a JSON object" }, 400);
    }
    const correct = (raw as Record<string, unknown>).correct;
    if (typeof correct !== "boolean") {
      // 请求错误：correct 必须为布尔值。
      return c.json({ error: "invalid payload", detail: "correct must be boolean" }, 400);
    }
    const updated = mastery.record(id, correct, Date.now());
    return c.json({ id, correct, mastery: updated });
  });

  return app;
}
