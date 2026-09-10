/**
 * 角色编排与拒绝规则测试。仅翻译名称与说明，不改断言、测试输入或命令夹具。
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  COMMAND_DENYLIST,
  hasShellMetachars,
  launchWorktree,
  refuseReason,
} from "../src/runtime.js";

test("拒绝列表拒绝 rm", () => {
  const reason = refuseReason({ branch: "x", command: "rm", argv: ["-rf", "/"] });
  assert.match(String(reason), /denylisted/);
});

test("拒绝列表拒绝 sudo", () => {
  const reason = refuseReason({ branch: "x", command: "sudo", argv: ["ls"] });
  assert.match(String(reason), /denylisted/);
});

test("拒绝列表拒绝 curl", () => {
  const reason = refuseReason({ branch: "x", command: "curl", argv: [] });
  assert.match(String(reason), /denylisted/);
});

test("识别测试给定的 shell 元字符", () => {
  assert.equal(hasShellMetachars("foo;bar"), true);
  assert.equal(hasShellMetachars("foo && bar"), true);
  assert.equal(hasShellMetachars("foo|bar"), true);
  assert.equal(hasShellMetachars("foo$(whoami)"), true);
  assert.equal(hasShellMetachars("plain.arg"), false);
});

test("argv 含元字符时拒绝启动", () => {
  const reason = refuseReason({
    branch: "x",
    command: "node",
    argv: ["-e", "1", ";", "echo", "pwned"],
  });
  assert.match(String(reason), /shell metacharacters/);
});

test("未列入拒绝列表且参数符合规则的命令通过检查", () => {
  const reason = refuseReason({
    branch: "x",
    command: "node",
    argv: ["-e", "console.log(1)"],
  });
  assert.equal(reason, null);
});

test("launchWorktree 拒绝列出的命令且不执行", async () => {
  const result = await launchWorktree({
    branch: "x",
    command: "rm",
    argv: ["-rf", "/"],
  });
  assert.match(String(result.refused), /denylisted/);
  assert.equal(result.stdout, "");
});

test("拒绝列表包含预期命令", () => {
  assert.ok(COMMAND_DENYLIST.has("rm"));
  assert.ok(COMMAND_DENYLIST.has("sudo"));
  assert.ok(COMMAND_DENYLIST.has("dd"));
});

test("带完整路径的命令按基名命中拒绝列表", () => {
  const reason = refuseReason({ branch: "x", command: "/bin/rm", argv: ["-rf", "/"] });
  assert.match(String(reason), /denylisted/);
});

test("解释器 -lc 脚本调用被列出的命令时拒绝", () => {
  const reason = refuseReason({
    branch: "x",
    command: "bash",
    argv: ["-lc", "rm -rf /"],
  });
  assert.match(String(reason), /denylisted|metacharacters/);
});
