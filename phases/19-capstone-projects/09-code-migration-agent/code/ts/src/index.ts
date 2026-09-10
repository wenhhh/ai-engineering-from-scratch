/**
 * 可选的 HTTP 演示入口；默认仅执行模拟并打印汇总。
 * 端口和环境变量保留原接口，仓库名、运行时标识与机器状态不翻译。
 */

/**
 * 代码迁移智能体：仪表盘示例入口（TypeScript）。
 *
 * 对应 ../../docs/zh.md 的仪表盘层设计；当前实际只模拟状态变化，
 * 不启动 Python 智能体或沙箱。Hono 提供 HTML 首页、/migrations
 * 与 /migrations/:id。状态机见 migrations.ts；预算和费用见 cost.ts；
 * 共享类型见 types.ts。
 *
 * 固定英文来源：phases/19-capstone-projects/09-code-migration-agent/docs/en.md
 * 配方参考：https://docs.openrewrite.org 与 libcst Python 解析器。
 */

import { serve } from "@hono/node-server";
import { buildApp } from "./server.js";
import { defaultSeed, rolledUpStats, tickAll } from "./migrations.js";

function summarise(migrations: ReturnType<typeof defaultSeed>): void {
  const stats = rolledUpStats(migrations);
  console.log("[仪表盘] 已建立模拟迁移：", migrations.length);
  for (const m of migrations) {
    const passed = m.files.filter((f) => f.status === "passed").length;
    console.log(
      `[仪表盘] ${m.repo} ${m.sourceRuntime}->${m.targetRuntime} ` +
        `状态=${m.state} 文件=${passed}/${m.files.length} ` +
        `轮数=${m.turns}/${m.maxTurns} 费用=$${m.spentUsd.toFixed(2)}`,
    );
  }
  console.log("[仪表盘] 汇总：", stats);
}

export function runDemoTicks(rounds: number): ReturnType<typeof defaultSeed> {
  const migrations = defaultSeed();
  for (let i = 0; i < rounds; i++) tickAll(migrations);
  return migrations;
}

function main(): void {
  console.log("[仪表盘] 模拟 40 次智能体进度步进……");
  const migrations = runDemoTicks(40);
  summarise(migrations);
  if (process.env["SERVE"] === "1") {
    const port = Number(process.env["PORT"] ?? 8009);
    const app = buildApp(migrations);
    serve({ fetch: app.fetch, port }, (info) => {
      console.log(`[仪表盘] 服务地址：http://localhost:${info.port}`);
    });
    setInterval(() => tickAll(migrations), 750).unref();
  } else {
    console.log(
      "[仪表盘] 设置 SERVE=1 启动 HTTP 仪表盘；PORT 默认为 8009",
    );
  }
}

main();
