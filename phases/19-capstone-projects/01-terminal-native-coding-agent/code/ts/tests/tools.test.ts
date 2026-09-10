/**
 * 工具回归测试：本轮只翻译名称和说明，不改断言与夹具。
 * 路径样本、英文异常匹配和命令输出前缀保持不变；测试仅在临时目录写入文件。
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  TOOLS,
  ReadFileArgs,
  RunShellArgs,
  toolReadFile,
  toolRunShell,
} from "../src/tools.ts";

test("toolReadFile：读取示例根目录内的文件", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "p19-01-"));
  try {
    writeFileSync(path.join(dir, "hello.txt"), "hi there", "utf8");
    const out = toolReadFile(dir, { path: "hello.txt" });
    assert.equal(out, "hi there");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("toolReadFile：拒绝给定的路径遍历样本", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "p19-01-"));
  try {
    assert.throws(() => toolReadFile(dir, { path: "../../../etc/passwd" }), /escapes sandbox/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("toolRunShell：返回确定性的桩输出", () => {
  const out = toolRunShell("/tmp", { cmd: "ls" });
  assert.match(out, /^exit=0/);
  assert.match(out, /README\.md/);
});

test("zod 模式拒绝空参数", () => {
  assert.throws(() => ReadFileArgs.parse({ path: "" }));
  assert.throws(() => RunShellArgs.parse({ cmd: "" }));
});

test("TOOLS 注册表包含两个工具函数", () => {
  assert.equal(typeof TOOLS.read_file, "function");
  assert.equal(typeof TOOLS.run_shell, "function");
});
