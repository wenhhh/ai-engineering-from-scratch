// 本地审批教学流程；工具响应、计划、摘要与模拟数据保持原契约。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { runTicket, executePlan, type Tool } from "./main.ts";
const args: Record<string, string> = {};
let approved = false;
for (let i = 2; i < process.argv.length; i++) {
  const key = process.argv[i];
  if (key === "--approved") {
    approved = true;
    continue;
  }
  if (
    !["--ticket", "--checkpoint", "--out"].includes(key) ||
    !process.argv[i + 1]
  )
    throw new Error(
      "Use --ticket FILE --out DIRECTORY, or --checkpoint FILE --approved --out DIRECTORY",
    );
  args[key] = process.argv[++i];
}
if (
  Boolean(args["--ticket"]) === Boolean(args["--checkpoint"]) ||
  !args["--out"]
)
  throw new Error("Choose one --ticket or --checkpoint and provide --out");
const effects: { name: string; query: string }[] = [];
const tool: Tool = async (name, query) => {
  effects.push({ name, query });
  return name === "lookup"
    ? "Local workshop policy: record equipment returns on the desk card."
    : "Local simulation recorded update: " + query;
};
const result = args["--checkpoint"]
  ? await executePlan(
      JSON.parse(readFileSync(args["--checkpoint"], "utf8")),
      tool,
      { approved },
    )
  : await runTicket(JSON.parse(readFileSync(args["--ticket"], "utf8")), tool, {
      approved,
    });
const out = resolve(args["--out"]);
mkdirSync(out, { recursive: true });
const report = {
  method: "Scratch workflow with an injected local simulated tool",
  result,
  effects,
};
writeFileSync(resolve(out, "workflow.json"), JSON.stringify(report, null, 2));
if (result.status === "suspended")
  writeFileSync(
    resolve(out, "checkpoint.json"),
    JSON.stringify(result.checkpoint, null, 2),
  );
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
writeFileSync(
  resolve(out, "index.html"),
  '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>工作流审阅</title><style>body{font:18px system-ui;max-width:850px;margin:3rem auto;padding:0 1rem}pre{white-space:pre-wrap}</style><h1>工作流审阅</h1><p>本地模拟工具；没有修改外部账户。状态 complete 表示完成，suspended 表示待审暂停，failed 表示失败。</p><h2>' +
    escape(result.status) +
    "</h2><pre>" +
    escape(JSON.stringify(report, null, 2)) +
    "</pre></html>",
);
console.log(
  JSON.stringify(
    { status: result.status, effects, output: resolve(out, "index.html") },
    null,
    2,
  ),
);
if (result.status === "failed") process.exitCode = 1;
