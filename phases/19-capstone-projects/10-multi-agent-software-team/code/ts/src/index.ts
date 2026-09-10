/**
 * 团队与启动器演示。仅运行固定可信的本地示例；拒绝列表不构成安全沙箱。
 * 子进程中的英文输出是固定脚本夹具，保留原值；它所称的 sandbox ready 不代表已建立沙箱。
 */

/**
 * 多智能体软件团队：综合项目示例入口（TypeScript）。
 *
 * 对应 ../../docs/zh.md 的规划者／编码者／评审者分工与轮转协调器。
 * 共享工作空间仅存在于内存。启动器使用 execFile 执行真实子进程，
 * 拒绝部分命令和参数，但没有创建 Git 工作树或 Daytona 沙箱。
 * BRANCH 只是环境变量，不能提供文件系统隔离。
 *
 * 固定英文来源：phases/19-capstone-projects/10-multi-agent-software-team/docs/en.md
 * 原文参考：SWE-AF factory、MetaGPT 角色、AutoGen 0.4 actor graph；本例没有调用这些框架。
 */

import { Coordinator } from "./coordinator.js";
import { launchWorktree } from "./runtime.js";

async function worktreeDemo(): Promise<void> {
  console.log("[团队] 工作树启动桩：带拒绝列表的 execFile");
  const ok = await launchWorktree({
    branch: "feature/refund-rounding",
    command: "node",
    argv: ["-e", "console.log('coder sandbox ready: ' + process.env.BRANCH)"],
  });
  console.log("  node 标准输出：", ok.stdout.trim());
  if (ok.stderr) console.log("  node 标准错误：", ok.stderr.trim());

  const refused = await launchWorktree({
    branch: "feature/refund-rounding",
    command: "rm",
    argv: ["-rf", "/"],
  });
  console.log("  rm 拒绝原因：", refused.refused);

  const shellInjected = await launchWorktree({
    branch: "feature/refund-rounding",
    command: "node",
    argv: ["-e", "1", ";", "echo", "pwned"],
  });
  console.log("  元字符参数拒绝原因：", shellInjected.refused);
}

function teamDemo(): void {
  console.log("[团队] 协调器演示：从问题到模拟批准");
  const coordinator = new Coordinator();
  const result = coordinator.run({
    from: "user",
    to: "planner",
    topic: "issue.opened",
    body: "退款金额在舍入边界情况相差一分",
    ts: Date.now(),
  });
  console.log("  已批准：", result.approved, "轮数：", result.turns);
  console.log("  内存文件：");
  for (const file of coordinator.workspaceFiles()) {
    console.log(
      `    ${file.path} （写入者=${file.lastWriter} 修订次数=${file.revisions}）`,
    );
  }
  console.log("  消息日志：");
  for (const m of coordinator.messageLog()) {
    console.log(`    ${m.from} -> ${m.to} :: ${m.topic}`);
  }
  console.log("  统计：", coordinator.stats());
}

async function main(): Promise<void> {
  teamDemo();
  console.log();
  await worktreeDemo();
}

main().catch((err) => {
  console.error("[团队] 致命错误：", err);
  process.exit(1);
});
