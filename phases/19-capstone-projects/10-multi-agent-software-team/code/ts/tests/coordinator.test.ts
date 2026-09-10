/**
 * 角色编排与拒绝规则测试。仅翻译名称与说明，不改断言、测试输入或命令夹具。
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { Agent, CoderAgent, PlannerAgent, ReviewerAgent } from "../src/agent.js";
import { Coordinator } from "../src/coordinator.js";
import type { Message, Role } from "../src/types.js";

test("初始轮转列表包含三个不同角色", () => {
  const c = new Coordinator();
  const first = c.rotation();
  assert.equal(first.length, 3);
  assert.equal(new Set(first).size, 3);
});

test("一次步进后轮转顺序发生变化", () => {
  const c = new Coordinator();
  const before = c.rotation().join(",");
  c.run(
    {
      from: "user",
      to: "planner",
      topic: "issue.opened",
      body: "refund bug",
      ts: 0,
    },
    1,
  );
  const after = c.rotation().join(",");
  assert.notEqual(before, after);
});

test("示例问题在十二轮内获得模拟批准", () => {
  const c = new Coordinator();
  const result = c.run({
    from: "user",
    to: "planner",
    topic: "issue.opened",
    body: "refund amounts off-by-one cent on edge rounding cases",
    ts: 0,
  });
  assert.equal(result.approved, true);
  assert.ok(result.turns <= 12);
});

test("日志包含批准消息", () => {
  const c = new Coordinator();
  c.run({
    from: "user",
    to: "planner",
    topic: "issue.opened",
    body: "fix",
    ts: 0,
  });
  const topics = c.messageLog().map((m) => m.topic);
  assert.ok(topics.includes("review.approved"));
});

test("工作空间包含计划和退款文件", () => {
  const c = new Coordinator();
  c.run({
    from: "user",
    to: "planner",
    topic: "issue.opened",
    body: "fix",
    ts: 0,
  });
  const files = c.workspaceFiles().map((f) => f.path);
  assert.ok(files.includes("PLAN.md"));
  assert.ok(files.includes("refunds.py"));
});

test("自定义角色集合的轮转起点遍历全部角色", () => {
  class StubAgent extends Agent {
    constructor(public readonly role: Role) {
      super();
    }
    step(): Message | null {
      return null;
    }
  }
  const c = new Coordinator([
    new StubAgent("planner"),
    new StubAgent("coder"),
    new StubAgent("reviewer"),
  ]);
  const seen = new Set<Role>();
  for (let i = 0; i < 3; i++) {
    seen.add(c.rotation()[0]!);
    c.run(
      {
        from: "user",
        to: "planner",
        topic: "noop",
        body: "",
        ts: 0,
      },
      1,
    );
  }
  assert.equal(seen.size, 3);
});

test("三个智能体类型公开对应的角色标识", () => {
  assert.equal(new PlannerAgent().role, "planner");
  assert.equal(new CoderAgent().role, "coder");
  assert.equal(new ReviewerAgent().role, "reviewer");
});
