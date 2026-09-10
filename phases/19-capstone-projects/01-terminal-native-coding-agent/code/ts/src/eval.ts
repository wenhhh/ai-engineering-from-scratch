/**
 * 离线评估计数器：逐个任务运行同一个脚本模型，检查 passed 和完成标记数量。
 * 任务文本仅进入计划标题，不会改变脚本行为；没有真的诊断、概括或运行冒烟测试。
 * expectedDone 只是计划状态计数，不能作为业务任务完成的证据。
 */

import { runAgent } from "./harness.ts";

export type EvalCase = { task: string; expectedDone: number };

export const EVAL_TASKS: EvalCase[] = [
  { task: "诊断 worker.rs", expectedDone: 3 },
  { task: "概括 README", expectedDone: 3 },
  { task: "运行冒烟测试", expectedDone: 3 },
];

export type EvalResult = { passed: number; failed: number };

export function runEval(sandbox: string, cases: EvalCase[] = EVAL_TASKS): EvalResult {
  let passed = 0;
  let failed = 0;
  for (const t of cases) {
    const r = runAgent(t.task, sandbox);
    // [x] 是计划完成标记；保留原格式供此处计数和测试匹配。
    const doneCount = (r.plan.match(/\[x\]/g) ?? []).length;
    if (r.passed && doneCount >= t.expectedDone) passed += 1;
    else failed += 1;
  }
  return { passed, failed };
}
