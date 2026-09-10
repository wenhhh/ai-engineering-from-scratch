/**
 * 智能体调度桩与内存审计日志。
 * 每次调用只追加两条记录并返回拟用分支名，不克隆、不创建沙箱、分支或 PR。
 * all 返回数组的浅复制，条目对象仍共享；同一问题重复投递会重复追加记录。
 */

import type { AuditEntry } from "./types.js";

export class AuditLog {
  private entries: AuditEntry[] = [];

  log(entry: AuditEntry): void {
    this.entries.push(entry);
  }

  all(): AuditEntry[] {
    return [...this.entries];
  }

  count(): number {
    return this.entries.length;
  }
}

export function dispatchAgent(
  audit: AuditLog,
  repo: string,
  issueNumber: number,
  title: string,
): string {
  const draftBranch = `agent/issue-${issueNumber}`;
  audit.log({
    ts: Date.now(),
    event: "issues.opened",
    action: "dispatched_agent",
    repo,
    issue: issueNumber,
    note: `仅记录拟议操作：克隆 ${repo}、启动沙箱，分支=${draftBranch}，标题="${title}"`,
  });
  audit.log({
    ts: Date.now(),
    event: "issues.opened",
    action: "stub_pr_created",
    repo,
    issue: issueNumber,
    note: `仅记录拟议操作：在 ${repo} 创建草稿 PR，从 ${draftBranch} 合并到 main`,
  });
  return draftBranch;
}
