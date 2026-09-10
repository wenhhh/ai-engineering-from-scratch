/**
 * 作业状态转换测试。只翻译名称和说明，不改时钟、数值、夹具或断言。
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { JobStore, seedFixture } from "../src/jobs.js";
import { advanceJob, overallStatus } from "../src/stages.js";
import type { Job } from "../src/types.js";
import { STAGE_DURATIONS_MS, STAGES } from "../src/types.js";

function freshJob(createdAt: number): Job {
  const store = new JobStore();
  return store.create("t-1", "vid", "q", createdAt);
}

test("刚创建时处于待处理状态", () => {
  const created = 1_000_000_000_000;
  const job = freshJob(created);
  advanceJob(job, created);
  assert.equal(overallStatus(job), "pending");
  assert.ok(job.stages.every((s) => s.status === "pending"));
});

test("第一阶段进行中时整体状态为进行中", () => {
  const created = 1_000_000_000_000;
  const job = freshJob(created);
  advanceJob(job, created + 600);
  const first = job.stages[0];
  assert.ok(first);
  assert.equal(first.status, "running");
  assert.equal(overallStatus(job), "running");
});

test("经过时间超过总预设耗时后全部阶段完成", () => {
  const created = 1_000_000_000_000;
  const job = freshJob(created);
  const total = STAGES.reduce((acc, s) => acc + STAGE_DURATIONS_MS[s], 0);
  advanceJob(job, created + total + 1);
  assert.equal(overallStatus(job), "done");
  assert.ok(job.stages.every((s) => s.status === "done"));
});

test("seedFixture 建立三个示例作业", () => {
  const store = new JobStore();
  seedFixture(store);
  assert.equal(store.list().length, 3);
  const detail = store.detail("job-001");
  assert.ok(detail);
  assert.equal(detail.id, "job-001");
});

test("未知作业 ID 的 detail 返回 null", () => {
  const store = new JobStore();
  seedFixture(store);
  assert.equal(store.detail("missing"), null);
});
