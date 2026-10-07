# 跨智能体技能安装器（Cross-Agent Skill Installer）

一个跨智能体升级工具，目标是提供可审阅的差异，并且不丢失本地修改。

可移植技能包包含元数据和相对路径下的 UTF-8 文件。将 SKILL.md 作为入口文档，拒绝任何可能越出所选安装根目录的资源名称。Orchard 原创技能包附带恢复检查清单。

## 从学习者工作区开始

[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/en.md)、[安全与密钥审计](../../phases/17-infrastructure-and-production/25-security-secrets-audit/docs/en.md)。语言基础：[TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)。

评分器需要 Node 22.18+ 和 Python 3.10+。核心 TypeScript 无需安装依赖包即可运行。

```bash
python3 scripts/project_test.py skill-installer --init learning-artifacts/skill-installer
python3 scripts/project_test.py skill-installer --stage 1 --path learning-artifacts/skill-installer
```

## 构建路线

1. [校验可移植技能包](stages/01-bundle/docs/en.md)
2. [转换元数据并计算内容哈希](stages/02-translate/docs/en.md)
3. [在指定根目录内原子安装](stages/03-install/docs/en.md)
4. [升级时保护本地修改](stages/04-upgrades/docs/en.md)

## 使用自己的输入运行

各阶段完成后，这些命令会用 Orchard 原创示例运行你的工作区代码。将示例路径替换为你自己的文件。

```bash
node learning-artifacts/skill-installer/cli.ts inspect projects/skill-installer/examples/orchard-release.json codex
```

要先检查完整参考实现，可将同一命令中的 `learning-artifacts/skill-installer` 替换为 `projects/skill-installer/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例均明确给出，方便其他工具读取。

## 集成边界

inspect 只执行预演。install 需要技能包、智能体、根目录和可信的预期来源摘要。支持的目标映射为 codex=.agents/skills、claude=.claude/skills、cursor=.cursor/skills。发现路径在本地配置；安装成功不能证明另一个正在运行的智能体已经启用该技能。

```bash
python3 scripts/project_test.py skill-installer --all --solution --strict
python3 scripts/project_test.py skill-installer --all --path learning-artifacts/skill-installer --strict
```

第一条命令检查参考实现，第二条检查你的实现。已发布的示例和测试提供回归证据，不属于生产认证或未见过的基准。

## 权威参考资料

- [Agent Skills 规范](https://agentskills.io/specification)
- [Node 加密 API](https://nodejs.org/api/crypto.html)
- [Node 文件系统 API](https://nodejs.org/api/fs.html)

译注：这里的 translate 表示转换技能元数据格式，不是自然语言翻译。来源摘要只覆盖 files 的排序映射，不绑定顶层 name 和 description；顶层元数据必须另行从可信渠道核实。模板正文、参考材料、异常和 JSON 字段保留原值。更新采用先移走旧目录、再移入新目录的两次重命名，不能将其理解为对并发读取者无间隙的替换或断电事务。
