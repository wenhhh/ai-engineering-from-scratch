# 技能路由器（Skill Router）

一个路由调试器，用于解释为何选中了错误技能，以及如何修正规则。

从 SKILL.md 中的名称与描述发现技能，再将 routing.json 作为本地路由扩展读取。目录名必须与技能名一致。路由元数据不属于可移植技能格式。

## 从学习者工作区开始

[工具结构定义设计](../../phases/13-tools-and-protocols/05-tool-schema-design/docs/en.md)、[验证门禁](../../phases/14-agent-engineering/38-verification-gates/docs/en.md)。语言基础：[TypeScript 对象类型](https://www.typescriptlang.org/docs/handbook/2/objects.html)。

评分器需要 Node 22.18+ 和 Python 3.10+。核心 TypeScript 无需安装依赖包即可运行。

```bash
python3 scripts/project_test.py skill-router --init learning-artifacts/skill-router
python3 scripts/project_test.py skill-router --stage 1 --path learning-artifacts/skill-router
```

## 构建路线

1. [解析带类型的技能目录](stages/01-catalog/docs/en.md)
2. [为关键词与仓库路径评分](stages/02-score/docs/en.md)
3. [执行前解析依赖关系](stages/03-dependencies/docs/en.md)
4. [遇到歧义或阻断时放弃路由](stages/04-route/docs/en.md)

## 使用自己的输入运行

各阶段完成后，这些命令会用 Orchard 原创示例运行你的工作区代码。将示例路径替换为你自己的文件。

```bash
node learning-artifacts/skill-router/cli.ts projects/skill-router/examples/skills projects/skill-router/examples/request.json
```

要先检查完整参考实现，可将同一命令中的 `learning-artifacts/skill-router` 替换为 `projects/skill-router/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例均明确给出，方便其他工具读取。

## 集成边界

SKILL.md 提供标准名称和描述；routing.json 是本项目明确说明的本地扩展。路由器只生成计划和解释，从不执行选中的技能。关键词分词采用 ASCII 词法基线，多语言路由模型需要另行扩展。

```bash
python3 scripts/project_test.py skill-router --all --solution --strict
python3 scripts/project_test.py skill-router --all --path learning-artifacts/skill-router --strict
```

第一条命令检查参考实现，第二条检查你的实现。已发布的示例和测试提供回归证据，不属于生产认证或未见过的基准。

## 权威参考资料

- [Agent Skills 规范](https://agentskills.io/specification)
- [Node 路径 API](https://nodejs.org/api/path.html)

译注：路由结果只表示选择建议，不会执行技能。目录中的技能指令、名称、描述、关键词、权限、请求夹具和错误值均保留原值，避免改变评分及返回 JSON。分词只识别 ASCII 字母与数字；纯中文请求不代表具备中文词法或语义路由能力。
