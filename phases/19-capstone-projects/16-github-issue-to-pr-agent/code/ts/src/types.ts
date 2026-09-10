/**
 * Webhook 载荷、审计条目与路由结果类型。
 * 字段名和状态为机器接口，保持原值；静态类型断言不构成输入的运行时验证。
 */

export type AuditEntry = {
  ts: number;
  event: string;
  action: string;
  repo: string;
  issue?: number;
  note: string;
};

export type IssuePayload = {
  action: string;
  issue?: { number: number; title: string; user?: { login: string } };
  repository?: { full_name: string };
};

export type PingPayload = { zen?: string; hook_id?: number };

export type RouteResult = { code: number; body: unknown };
