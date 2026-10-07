// 命令行帮助中的英文异常保留原契约，参数及输出解释见中文 README。
// 这里的 translate 表示转换技能元数据格式，不是自然语言翻译。来源摘要只覆盖 files 的排序映射，不绑定顶层 name 和 description；顶层元数据必须另行从可信渠道核实。模板正文、参考材料、异常和 JSON 字段保留原值。更新采用先移走旧目录、再移入新目录的两次重命名，不能将其理解为对并发读取者无间隙的替换或断电事务。
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { validate, digest, translate, install } from "./main.ts";
export async function execute(args: string[]) {
  const [command, file, agent = "codex", root, expected] = args;
  if (!["inspect", "install"].includes(command) || !file)
    throw new Error(
      "usage: cli.ts inspect bundle.json [agent] | install bundle.json agent root expected-source-digest",
    );
  const bundle = validate(JSON.parse(await fs.readFile(file, "utf8")));
  const source_digest = digest(bundle.files);
  if (command === "inspect")
    return {
      schema_version: 1,
      source_digest,
      translated_digest: digest(translate(bundle, agent)),
      files: translate(bundle, agent),
    };
  if (!root || !expected)
    throw new Error(
      "root and expected source digest required; inspect the bundle first",
    );
  return {
    schema_version: 1,
    source_digest,
    ...(await install(root, bundle, agent, expected)),
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    console.log(JSON.stringify(await execute(process.argv.slice(2)), null, 2));
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 1;
  }
}
