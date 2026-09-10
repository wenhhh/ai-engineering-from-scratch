/**
 * 八事件钩子总线和教学用命令防护。
 * 事件名是接口枚举，保留英文；本循环不一定触发全部已声明事件。
 * HookBus 按注册顺序传递载荷，后一个钩子可以看到前一个返回的修改。
 */

import type { HookEvent, HookFn, HookPayload, ToolArgs } from "./types.ts";

export class HookBus {
  static readonly EVENTS: HookEvent[] = [
    "SessionStart",
    "SessionEnd",
    "PreToolUse",
    "PostToolUse",
    "UserPromptSubmit",
    "Notification",
    "Stop",
    "PreCompact",
  ];

  private hooks: Map<HookEvent, HookFn[]> = new Map();

  constructor() {
    for (const e of HookBus.EVENTS) this.hooks.set(e, []);
  }

  on(event: HookEvent, fn: HookFn): void {
    this.hooks.get(event)!.push(fn);
  }

  fire(event: HookEvent, payload: HookPayload): HookPayload {
    let current = payload;
    for (const fn of this.hooks.get(event)!) {
      current = fn(current) ?? current;
    }
    return current;
  }
}

// 只匹配原例的两种命令模式，不是完整的 shell 语法分析或安全隔离。
const DESTRUCTIVE_PATTERNS = [/\brm\s+-rf\b/, /\bshutdown\b/];

export function destructiveGuard(payload: HookPayload): HookPayload {
  const rawArgs = payload.args;
  const args =
    rawArgs && typeof rawArgs === "object" ? (rawArgs as ToolArgs) : ({} as ToolArgs);
  const rawCmd = args.cmd;
  if (typeof rawCmd !== "string") return payload;
  const cmd = rawCmd.trim().toLowerCase();
  if (DESTRUCTIVE_PATTERNS.some((re) => re.test(cmd))) {
    return {
      ...payload,
      blocked: true,
      // 拒绝原因：PreToolUse 拦截破坏性命令。测试会匹配 destructive，故保留英文。
      reason: "destructive command blocked by PreToolUse hook",
    };
  }
  return payload;
}
