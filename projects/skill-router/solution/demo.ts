// 使用本地原创夹具运行演示；操作范围以显式测试目录为准。
// 路由结果只表示选择建议，不会执行技能。目录中的技能指令、名称、描述、关键词、权限、请求夹具和错误值均保留原值，避免改变评分及返回 JSON。分词只识别 ASCII 字母与数字；纯中文请求不代表具备中文词法或语义路由能力。
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execute } from "./cli.ts";
const examples = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../examples",
);
console.log(
  JSON.stringify(
    await execute([
      path.join(examples, "skills"),
      path.join(examples, "request.json"),
    ]),
    null,
    2,
  ),
);
