/**
 * 工具接口及参数校验。
 * read_file 使用真实文件系统路径检查；run_shell 在 TypeScript 版中只返回
 * 固定字符串，完全不执行命令，与 Python 版的真实 subprocess.run 不同。
 * TRUNCATE_BYTES 是原变量名，实际截断单位为 JavaScript UTF-16 代码单元。
 */

import { readFileSync, realpathSync } from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import type { ToolArgs, ToolFn } from "./types.ts";

export const TRUNCATE_BYTES = 4096;

export const ReadFileArgs = z.object({ path: z.string().min(1) });
export const RunShellArgs = z.object({ cmd: z.string().min(1) });

export function toolReadFile(sandbox: string, args: ToolArgs): string {
  const parsed = ReadFileArgs.parse(args);
  const candidate = path.resolve(sandbox, parsed.path);
  const sandboxResolved = path.resolve(sandbox);
  let full: string;
  let root: string;
  try {
    full = realpathSync(candidate);
    root = realpathSync(sandboxResolved);
  } catch (err) {
    // 无法解析路径时也使用此英文错误前缀；不一定真的发生越界。
    throw new Error(`path escapes sandbox: ${(err as Error).message}`);
  }
  // 按真实路径及目录分隔符检查范围，不能单独把它当作操作系统沙箱。
  if (full !== root && !full.startsWith(root + path.sep)) {
    // 路径越出示例根目录；测试会匹配 escapes sandbox，故保留英文。
    throw new Error("path escapes sandbox");
  }
  const data = readFileSync(full, "utf8");
  return data.slice(0, TRUNCATE_BYTES);
}

export function toolRunShell(_sandbox: string, args: ToolArgs): string {
  const parsed = RunShellArgs.parse(args);
  // 固定命令输出：不是实际 ls 或 git status 的运行结果。
  const stub: Record<string, string> = {
    ls: "README.md\nsrc\ntests",
    "git status": "On branch agent/demo\nnothing to commit, working tree clean",
  };
  // 其他命令也只生成“(stub) ran”占位结果；英文前缀属于原工具输出契约。
  const out = stub[parsed.cmd] ?? `(stub) ran: ${parsed.cmd}`;
  return `exit=0\n${out.slice(0, TRUNCATE_BYTES)}`;
}

export const TOOLS: Record<string, ToolFn> = {
  read_file: toolReadFile,
  run_shell: toolRunShell,
};
