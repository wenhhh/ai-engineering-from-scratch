/**
 * 预算与状态机回归测试。仅翻译测试名称和说明，断言与夹具不变。
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  advanceFile,
  defaultSeed,
  fileDiff,
  migrationDone,
  rolledUpStats,
  tickOne,
} from "../src/migrations.js";

test("种子数据包含三个进行中的迁移任务", () => {
  const migrations = defaultSeed();
  assert.equal(migrations.length, 3);
  for (const m of migrations) {
    assert.equal(m.state, "running");
    assert.ok(m.files.length > 0);
  }
});

test("advanceFile 依次推进排队、改写、构建和通过状态", () => {
  const f = fileDiff("foo.java", "openrewrite");
  const noFail = () => 0.99;
  advanceFile(f, noFail);
  assert.equal(f.status, "rewriting");
  advanceFile(f, noFail);
  assert.equal(f.status, "building");
  advanceFile(f, noFail);
  assert.equal(f.status, "passed");
});

test("advanceFile 不再改变终态文件", () => {
  const f = fileDiff("foo.java", "openrewrite");
  f.status = "passed";
  advanceFile(f);
  assert.equal(f.status, "passed");
  f.status = "failed";
  advanceFile(f);
  assert.equal(f.status, "failed");
});

test("重复 tickOne 后所有文件到达终态且迁移停止", () => {
  const m = defaultSeed()[0]!;
  const det = () => 0.99;
  for (let i = 0; i < 200; i++) tickOne(m, det);
  assert.equal(migrationDone(m), true);
  assert.ok(m.state === "passed" || m.state === "failed");
});

test("rolledUpStats 正确汇总任务状态", () => {
  const m = defaultSeed();
  m[0]!.state = "passed";
  m[1]!.state = "failed";
  const stats = rolledUpStats(m);
  assert.equal(stats.passed, 1);
  assert.equal(stats.failed, 1);
  assert.equal(stats.running, 1);
  assert.equal(stats.total, 3);
});
