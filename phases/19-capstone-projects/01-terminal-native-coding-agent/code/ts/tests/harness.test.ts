/**
 * 框架回归测试：仅将测试名称和说明中文化，断言、输入夹具与正则均不变。
 * 这些测试检查原框架行为，不证明任务确实完成；here 目录没有 README.md 时，
 * 工具读取可能失败，但原例的脚本完成判定仍可通过。
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { runAgent } from "../src/harness.ts";
import { runEval } from "../src/eval.ts";
import { HookBus, destructiveGuard } from "../src/hooks.ts";
import { Budget, PlanState } from "../src/plan.ts";
import { parseCommand } from "../src/repl.ts";

const here = path.dirname(fileURLToPath(import.meta.url));

test("runAgent：脚本任务到达全 done 计划", () => {
  const r = runAgent("demo", here);
  assert.equal(r.passed, true);
  assert.ok(r.plan.includes("[x] 1."));
  assert.ok(r.plan.includes("[x] 3."));
  assert.equal(r.budget.turnsUsed >= 1, true);
  assert.equal(r.budget.dollarsUsed > 0, true);
});

test("runEval：三个离线任务的预设判定均通过", () => {
  const e = runEval(here);
  assert.equal(e.passed, 3);
  assert.equal(e.failed, 0);
});

test("HookBus：按注册顺序触发钩子", () => {
  const bus = new HookBus();
  const order: string[] = [];
  bus.on("PreToolUse", (p) => {
    order.push("a");
    return p;
  });
  bus.on("PreToolUse", (p) => {
    order.push("b");
    return p;
  });
  bus.fire("PreToolUse", { tool: "x" });
  assert.deepEqual(order, ["a", "b"]);
});

test("destructiveGuard：拦截 rm -rf", () => {
  const out = destructiveGuard({ tool: "run_shell", args: { cmd: "rm -rf /" } });
  assert.equal(out.blocked, true);
  assert.match(String(out.reason), /destructive/);
});

test("destructiveGuard：放行给定的安全命令", () => {
  const out = destructiveGuard({ tool: "run_shell", args: { cmd: "ls" } });
  assert.equal(out.blocked, undefined);
});

test("Budget：达到轮次上限时触发限制", () => {
  const b = new Budget();
  b.maxTurns = 2;
  b.step(10, 0.01);
  assert.equal(b.exceeded(), null);
  b.step(10, 0.01);
  assert.equal(b.exceeded(), "turn_limit");
});

test("PlanState：摘要正确显示状态标记", () => {
  const p = new PlanState("write");
  p.rewrite([
    { id: 1, description: "draft", status: "done", note: "" },
    { id: 2, description: "edit", status: "in_progress", note: "" },
  ]);
  const s = p.summary();
  assert.match(s, /\[x\] 1\. draft/);
  assert.match(s, /\[>\] 2\. edit/);
});

test("parseCommand：识别核心命令动词", () => {
  assert.equal(parseCommand("quit").kind, "quit");
  assert.equal(parseCommand("help").kind, "help");
  assert.equal(parseCommand("eval").kind, "eval");
  const run = parseCommand("run fix the bug");
  assert.equal(run.kind, "run");
  if (run.kind === "run") assert.equal(run.task, "fix the bug");
  assert.equal(parseCommand("teleport").kind, "unknown");
});
