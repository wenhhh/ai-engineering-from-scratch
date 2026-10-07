// 使用本地原创夹具运行演示；操作范围以显式测试目录为准。
// 这里的 translate 表示转换技能元数据格式，不是自然语言翻译。来源摘要只覆盖 files 的排序映射，不绑定顶层 name 和 description；顶层元数据必须另行从可信渠道核实。模板正文、参考材料、异常和 JSON 字段保留原值。更新采用先移走旧目录、再移入新目录的两次重命名，不能将其理解为对并发读取者无间隙的替换或断电事务。
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execute } from "./cli.ts";
const examples = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../examples",
);
const root = await fs.mkdtemp(path.join(os.tmpdir(), "skill-install-demo-"));
try {
  const input = path.join(examples, "orchard-release.json");
  const inspected = await execute(["inspect", input, "codex"]);
  const installed = await execute([
    "install",
    input,
    "codex",
    root,
    inspected.source_digest,
  ]);
  await fs.appendFile(
    path.join(installed.destination, "references/checklist.md"),
    "Local review note: verify the restore log.\n",
  );
  let conflict = "";
  try {
    await execute(["install", input, "codex", root, inspected.source_digest]);
  } catch (e) {
    conflict = (e as Error).message;
  }
  console.log(
    JSON.stringify(
      {
        schema_version: 1,
        source_digest: inspected.source_digest,
        installed: {
          ...installed,
          destination: ".agents/skills/orchard-release",
        },
        upgrade: conflict,
        local_edit_preserved: (
          await fs.readFile(
            path.join(installed.destination, "references/checklist.md"),
            "utf8",
          )
        ).includes("Local review note"),
      },
      null,
      2,
    ),
  );
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
