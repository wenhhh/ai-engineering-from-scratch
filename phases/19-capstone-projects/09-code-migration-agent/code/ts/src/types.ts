/**
 * 迁移任务共享类型。
 * 文件状态依次为 queued（排队）、rewriting（改写）、building（构建），
 * 终态为 passed（通过）或 failed（失败）。这些机器枚举不翻译。
 * linesAdded/linesRemoved 是模拟改动行数，testsTouched 是模拟涉及的测试数，
 * 不是实际代码变更或执行测试的证据；startedAt 为毫秒时间戳。
 */

export type FileStatus =
  | "queued"
  | "rewriting"
  | "building"
  | "passed"
  | "failed";

export type Recipe = "openrewrite" | "libcst" | "agent";

export type FileDiff = {
  path: string;
  status: FileStatus;
  recipe: Recipe;
  linesAdded: number;
  linesRemoved: number;
  testsTouched: number;
  lastError?: string;
};

export type MigrationState = "running" | "passed" | "failed" | "queued";

export type Migration = {
  id: string;
  repo: string;
  sourceRuntime: string;
  targetRuntime: string;
  startedAt: number;
  budgetUsd: number;
  spentUsd: number;
  turns: number;
  maxTurns: number;
  files: FileDiff[];
  state: MigrationState;
};

export type RolledUpStats = {
  total: number;
  running: number;
  passed: number;
  failed: number;
  spentUsd: number;
};
