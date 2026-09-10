/**
 * 预算与状态机回归测试。仅翻译测试名称和说明，断言与夹具不变。
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { BUDGET_USD, MAX_TURNS, chargeTurn, checkBudget } from "../src/cost.js";
import { defaultSeed } from "../src/migrations.js";

test("checkBudget 对新建迁移返回预算未耗尽", () => {
  const m = defaultSeed()[0]!;
  const v = checkBudget(m);
  assert.equal(v.exhausted, false);
});

test("checkBudget 检出轮数耗尽", () => {
  const m = defaultSeed()[0]!;
  m.turns = MAX_TURNS;
  const v = checkBudget(m);
  assert.equal(v.exhausted, true);
  assert.equal(v.reason, "turns");
});

test("checkBudget 检出费用耗尽", () => {
  const m = defaultSeed()[0]!;
  m.spentUsd = BUDGET_USD;
  const v = checkBudget(m);
  assert.equal(v.exhausted, true);
  assert.equal(v.reason, "cost");
});

test("chargeTurn 增加轮数并累计费用", () => {
  const m = defaultSeed()[0]!;
  chargeTurn(m, () => 0.5);
  assert.equal(m.turns, 1);
  assert.ok(m.spentUsd > 0);
  assert.ok(m.spentUsd < BUDGET_USD);
});

test("按测试给定的最高单轮费用累计 MAX_TURNS 次仍不超过预算", () => {
  const m = defaultSeed()[0]!;
  for (let i = 0; i < MAX_TURNS; i++) chargeTurn(m, () => 1);
  assert.equal(m.turns, MAX_TURNS);
  assert.ok(m.spentUsd <= BUDGET_USD, `spent ${m.spentUsd} exceeds budget ${BUDGET_USD}`);
});
