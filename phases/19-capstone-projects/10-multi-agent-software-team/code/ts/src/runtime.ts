/**
 * 通过 execFile 执行命令的教学启动器，不是真实工作树或沙箱。
 * 它按命令基名和若干字符串检查拒绝列表，允许的程序仍以宿主权限运行，
 * 继承宿主环境与当前目录。BRANCH 仅设置环境变量；不要传入不可信命令或源码。
 * 拒绝原因保留英文，现有测试按 denylisted 和 shell metacharacters 匹配。
 * 子进程失败被转换为 stdout/stderr 结果；结果没有单独的退出码或成功字段。
 */

import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type { LaunchArgs, LaunchResult } from "./types.js";

const execFileP = promisify(execFile);

export const COMMAND_DENYLIST: ReadonlySet<string> = new Set([
  "rm",
  "sudo",
  "shutdown",
  "reboot",
  "mkfs",
  "dd",
  "curl",
  "wget",
  "chmod",
  "chown",
  "kill",
  "pkill",
]);

const INTERPRETERS: ReadonlySet<string> = new Set([
  "sh",
  "bash",
  "zsh",
  "ksh",
  "dash",
  "python",
  "python3",
  "node",
  "perl",
  "ruby",
]);

const INTERPRETER_FLAGS = new Set(["-c", "-lc", "-ic"]);

export const SHELL_METACHARS = [";", "&&", "||", "|", "`", "$("];

export function hasShellMetachars(arg: string): boolean {
  return SHELL_METACHARS.some((m) => arg.includes(m));
}

function commandBasename(command: string): string {
  return path.basename(command).toLowerCase();
}

export function refuseReason(args: LaunchArgs): string | null {
  const base = commandBasename(args.command);
  if (COMMAND_DENYLIST.has(base)) {
    // 拒绝原因：命令位于工作树启动桩的拒绝列表。
    return `command ${args.command} is denylisted in the worktree stub`;
  }
  if (INTERPRETERS.has(base)) {
    for (let i = 0; i < args.argv.length; i++) {
      const flag = args.argv[i] ?? "";
      if (INTERPRETER_FLAGS.has(flag)) {
        const script = (args.argv[i + 1] ?? "") + " " + args.argv.slice(i + 2).join(" ");
        if (hasShellMetachars(script)) {
          // 拒绝原因：解释器脚本含 shell 元字符。
          return `interpreter ${base} script contains shell metacharacters`;
        }
        for (const token of script.split(/\s+/)) {
          if (COMMAND_DENYLIST.has(commandBasename(token))) {
            // 拒绝原因：脚本包含被拒绝的命令词项。
            return `interpreter ${base} script invokes denylisted command ${token}`;
          }
        }
      }
    }
  }
  for (const arg of args.argv) {
    if (hasShellMetachars(arg)) {
      // 拒绝原因：参数含 shell 元字符。
      return `arg ${arg} contains shell metacharacters`;
    }
  }
  return null;
}

export async function launchWorktree(args: LaunchArgs): Promise<LaunchResult> {
  const refused = refuseReason(args);
  if (refused) {
    return { stdout: "", stderr: "", refused };
  }
  try {
    const { stdout, stderr } = await execFileP(args.command, args.argv, {
      timeout: 5_000,
      env: { ...process.env, BRANCH: args.branch },
      shell: false,
    });
    return { stdout, stderr };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? e.message,
    };
  }
}
