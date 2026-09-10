/**
 * Webhook 事件路由。
 * 仅 issues.opened 进入调度桩；其他 issue 动作跳过，pull_request 只记观察日志。
 * 该函数本身不验签，HTTP 接收器应先验签；也没有请求去重或仓库允许列表。
 * issue 只被检查为对象，number/title 没有逐字段校验。错误载荷保持英文契约。
 */

import type { AuditLog } from "./agent.js";
import { dispatchAgent } from "./agent.js";
import type { IssuePayload, PingPayload, RouteResult } from "./types.js";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function route(audit: AuditLog, event: string, payload: unknown): RouteResult {
  if (!isObject(payload)) {
    // 请求错误：载荷必须是 JSON 对象。
    return { code: 400, body: { error: "payload must be a JSON object" } };
  }

  if (event === "ping") {
    if (payload.zen === undefined && payload.hook_id === undefined) {
      // 请求错误：ping 需要 zen 或 hook_id；值类型未进一步校验。
      return { code: 422, body: { error: "ping payload requires zen or hook_id" } };
    }
    const p = payload as PingPayload;
    return { code: 200, body: { pong: p.zen ?? "no zen", hook_id: p.hook_id ?? null } };
  }
  if (event === "issues") {
    if (typeof payload.action !== "string") {
      // 请求错误：issues 需要字符串 action。
      return { code: 422, body: { error: "issues payload requires string 'action'" } };
    }
    if (!isObject(payload.repository) || typeof payload.repository.full_name !== "string") {
      // 请求错误：issues 需要仓库完整名称。
      return { code: 422, body: { error: "issues payload requires repository.full_name" } };
    }
    // 请求错误 missing issue object 表示缺少 issue 对象。
    if (!isObject(payload.issue)) {
      return { code: 422, body: { error: "missing issue object" } };
    }
    const p = payload as IssuePayload;
    if (p.action !== "opened") {
      return { code: 200, body: { skipped: true, reason: `issues.${p.action}` } };
    }
    const repo = p.repository?.full_name ?? "unknown/unknown";
    const issue = p.issue;
    if (!issue) return { code: 422, body: { error: "missing issue object" } };
    const branch = dispatchAgent(audit, repo, issue.number, issue.title);
    return { code: 202, body: { dispatched: true, branch } };
  }
  if (event === "pull_request") {
    audit.log({
      ts: Date.now(),
      event: "pull_request",
      action: "observed",
      repo: "n/a",
      note: "已观察到 PR 生命周期事件",
    });
    return { code: 200, body: { observed: true } };
  }
  return { code: 200, body: { ignored: true, event } };
}
