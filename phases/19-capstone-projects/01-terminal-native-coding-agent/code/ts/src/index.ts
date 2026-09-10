/**
 * 程序入口：交互终端且带 --repl 时进入 REPL，否则运行预设演示与评估。
 * 本实现使用 Node readline，没有实际集成原文提及的 Bun + Ink 界面。
 * 错误消息保留英文，避免改变异常契约。离线评估通过不代表完成真实代码修复。
 */

// 综合项目 19/01：终端原生编码智能体运行框架（多文件 TypeScript）。
//
// 固定原文参考来源（本轮未更新核验）：
//   本课 docs/en.md：介绍 Bun + Ink 终端界面及原文列出的八类钩子。
//   Claude Code 文档            https://docs.anthropic.com/en/docs/claude-code
//   Model Context Protocol（模型上下文协议）      https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/
//   OpenTelemetry GenAI 语义约定 https://opentelemetry.io/docs/specs/semconv/gen-ai/
//
// 运行框架包含：REPL 命令解析器（repl.ts）、read_file/run_shell 工具派发器
// （tools.ts）、离线脚本模型（model.ts）、八事件钩子总线（hooks.ts）、每轮整体
// 重写的计划（plan.ts），以及简单的通过/失败计数器（eval.ts）。非交互路径
// 在退出前检查脚本演示计数；它不是实际业务任务的自证验收。

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { runAgent } from "./harness.ts";
import { runEval } from "./eval.ts";
import { isInteractive, repl } from "./repl.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main(): Promise<void> {
  const sandbox = path.resolve(__dirname, "..");
  if (isInteractive()) {
    await repl(sandbox);
    return;
  }
  const task = "在不调用网络模型的情况下演示计划／行动／观察循环";
  const result = runAgent(task, sandbox);
  console.log(result.plan);
  console.log("---");
  console.log(
    `轮次=${result.budget.turnsUsed} 词元=${result.budget.tokensUsed} ` +
      `费用=$${result.budget.dollarsUsed.toFixed(3)}`,
  );
  console.log("---");
  console.log(`轨迹事件数：${result.trace.length}`);
  for (const ev of result.trace) console.log(" ", JSON.stringify(ev));
  console.log("---");
  const e = runEval(sandbox);
  console.log(`评估：通过=${e.passed} 失败=${e.failed}`);
  if (e.passed !== 3 || e.failed !== 0) {
    // 异常含义：预设离线评估计数发生回归。
    throw new Error(`eval regression: passed=${e.passed} failed=${e.failed}`);
  }
  if (!result.passed) {
    // 异常含义：脚本演示未达到所有计划项均为 done 的状态。
    throw new Error("scripted demo run did not converge to all-done plan");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
