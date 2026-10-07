# 在字符预算内加载上下文

**第 4 阶段，共 4 阶段。** Rust。预计约 2 小时。

发现阶段返回名称和描述。只有请求的预算能够容纳完整文本时，激活阶段才追加正文。拒绝部分指令，不在约束中途截断。预算单位是字符，不是模型词元估算值。

```figure
pj-skill-validator-4
```

译注：图表范围：不解析真实元数据头，不检查描述非空及 1024 字符上限，也不访问资源文件；资源正文不计入图中预算。完整加载与路径校验由 Rust 实现执行。

## 实现边界

```rust
pub fn disclose(skill: &Skill, activate: bool, budget: usize) -> Result<String, Error>
```

权威参考：[官方参考资料](https://agentskills.io/specification)。

## Orchard 示例推演

编码前，复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。先完成[第 3 阶段](../../03-contain-resource-paths/docs/en.md)。

发现只加载元数据，激活再追加指令。若完整上下文仍能放入预算，命令行程序随后可追加一份明确指定的参考材料。计数字符，不计字节或模型词元；绝不截断半条指令。

```text
metadata length=80; body=120; separators=2
activation needs 202 characters
budget 200 -> Limit
```

## 构建与检查

先拼接完整上下文，再将字符数与预算比较。必须计入分隔符和请求的资源文本。

在学习者工作区实现本阶段。随附命令行辅助程序是调用你的函数的适配器，不会用参考实现替代你的代码。

```bash
python3 scripts/project_test.py skill-validator --stage 4 --path learning-artifacts/skill-validator
```

累计阶段全部通过后，从仓库根目录使用原始示例输入运行你的交付物：

```bash
rustc --edition=2021 learning-artifacts/skill-validator/cli.rs -o learning-artifacts/skill-validator/validator
learning-artifacts/skill-validator/validator projects/skill-validator/examples/orchard-release 2000 --activate references/restore.md
```

解析器接受普通单行值和与 JSON 兼容的带引号字符串。它明确拒绝多行 YAML、别名、标签和流式集合语法。发现和激活上下文使用字符预算，不按模型词元计数。现有路径规范化后必须仍位于提供的技能目录内。

## 继续探究

如何提供基于分词器的预算，同时避免与这里的字符限制混淆？
