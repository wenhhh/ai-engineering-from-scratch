# SKILL.md 校验器与加载器（SKILL.md Validator and Loader）

一个兼容性检查器，用于解释技能为何能在某个智能体中工作，却在另一个智能体中失败。

安装器输出带引号的元数据。接受普通单行标量，以及与 JSON 兼容的双引号标量，包括转义引号和 Unicode。拒绝标签、别名和多行 YAML，避免静默改变其解释。

## 从学习者工作区开始

[数据管理](../../phases/00-setup-and-tooling/09-data-management/docs/en.md)、[结构化输出](../../phases/11-llm-engineering/03-structured-outputs/docs/en.md)。语言基础：[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)。

安装 Rust（`rustc`）和 Python 3.10+。核心仅使用 Rust 标准库；Python 适配器在私有临时目录中编译。

```bash
python3 scripts/project_test.py skill-validator --init learning-artifacts/skill-validator
python3 scripts/project_test.py skill-validator --stage 1 --path learning-artifacts/skill-validator
```

## 构建路线

1. [解析明确限定的元数据头子集](stages/01-parse-an-explicit-frontmatter-subset/docs/en.md)
2. [校验名称和描述](stages/02-validate-names-and-descriptions/docs/en.md)
3. [将资源路径限制在根目录内](stages/03-contain-resource-paths/docs/en.md)
4. [在字符预算内加载上下文](stages/04-load-context-within-a-character-budget/docs/en.md)

## 使用自己的输入运行

各阶段完成后，这些命令会用 Orchard 原创示例运行你的工作区代码。将示例路径替换为你自己的文件。

```bash
rustc --edition=2021 learning-artifacts/skill-validator/cli.rs -o learning-artifacts/skill-validator/validator
learning-artifacts/skill-validator/validator projects/skill-validator/examples/orchard-release 2000 --activate references/restore.md
```

要先检查完整参考实现，可将同一命令中的 `learning-artifacts/skill-validator` 替换为 `projects/skill-validator/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例均明确给出，方便其他工具读取。

## 集成边界

解析器接受普通单行值和与 JSON 兼容的带引号字符串。它明确拒绝多行 YAML、别名、标签和流式集合语法。发现和激活上下文使用字符预算，不按模型词元计数。现有路径规范化后必须仍位于提供的技能目录内。

```bash
python3 scripts/project_test.py skill-validator --all --solution --strict
python3 scripts/project_test.py skill-validator --all --path learning-artifacts/skill-validator --strict
```

第一条命令检查参考实现，第二条检查你的实现。已发布的示例和测试提供回归证据，不属于生产认证或未见过的基准。

## 权威参考资料

- [官方参考资料](https://agentskills.io/specification)

译注：原样保留技能描述、正文、参考材料、解析错误和上下文字段，避免改变字符预算或下游模型输入。activate 只将指令加载进返回上下文，不表示已在任何智能体中启用。字符数按 Unicode 标量值统计，不等同于字节、模型词元或用户感知字符。
