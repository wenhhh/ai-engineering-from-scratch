/**
 * 读取—执行—显示的交互命令循环（REPL）。
 * 命令动词 run、eval、help、quit 及别名保留英文；run 后的任务内容可用中文。
 * 只在真实交互终端且传入 --repl 时启用；管道输入不走此交互路径。
 */

import * as readline from "node:readline";
import { runAgent } from "./harness.ts";
import { runEval } from "./eval.ts";

export type Command =
  | { kind: "run"; task: string }
  | { kind: "eval" }
  | { kind: "help" }
  | { kind: "quit" }
  | { kind: "unknown"; raw: string };

export function parseCommand(line: string): Command {
  const trimmed = line.trim();
  if (!trimmed) return { kind: "help" };
  if (trimmed === "quit" || trimmed === "exit") return { kind: "quit" };
  if (trimmed === "help" || trimmed === "?") return { kind: "help" };
  if (trimmed === "eval") return { kind: "eval" };
  // 保留命令解析正则，避免把用户可见命令语法一并翻译。
  const m = /^run\s+(.+)$/.exec(trimmed);
  if (m) return { kind: "run", task: m[1] };
  return { kind: "unknown", raw: trimmed };
}

export function helpText(): string {
  return [
    "运行框架命令：",
    "  run <task>   对一个任务运行脚本模型的计划／行动／观察循环（任务可用中文）",
    "  eval         运行离线评估并显示通过／失败数量",
    "  help         显示此帮助",
    "  quit         退出",
  ].join("\n");
}

export function isInteractive(): boolean {
  return process.stdin.isTTY === true && process.argv.includes("--repl");
}

export async function repl(sandbox: string): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(helpText());
  const ask = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));
  while (true) {
    const line = await ask("智能体> ");
    const cmd = parseCommand(line);
    if (cmd.kind === "quit") break;
    if (cmd.kind === "help") {
      console.log(helpText());
      continue;
    }
    if (cmd.kind === "eval") {
      const e = runEval(sandbox);
      console.log(`评估：通过=${e.passed} 失败=${e.failed}`);
      continue;
    }
    if (cmd.kind === "run") {
      const r = runAgent(cmd.task, sandbox);
      console.log(r.plan);
      console.log("---");
      console.log(
        `轮次=${r.budget.turnsUsed} 词元=${r.budget.tokensUsed} ` +
          `费用=$${r.budget.dollarsUsed.toFixed(3)} 计划判定通过=${r.passed}`,
      );
      continue;
    }
    console.log(`未知命令：${cmd.raw}；输入 help 查看帮助`);
  }
  rl.close();
}
