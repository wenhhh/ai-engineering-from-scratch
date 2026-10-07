# 校验名称和描述

**第 2 阶段，共 4 阶段。** Rust。预计约 2 小时。

加载器只接受长度为 1 至 64 字节的小写名称；内部允许单个连字符，不禁止数字开头。描述必须非空白且不超过 1024 个字符。对照元数据校验技能目录名，防止发现过程静默重命名技能包。

```figure
pj-skill-validator-2
```

译注：图表范围：不解析真实元数据头，不检查描述非空及 1024 字符上限，也不访问资源文件；资源正文不计入图中预算。完整加载与路径校验由 Rust 实现执行。

## 实现边界

```rust
pub fn validate(fields: &std::collections::BTreeMap<String,String>, directory: &str) -> Result<Skill, Error>
```

权威参考：[官方参考资料](https://agentskills.io/specification)。

## Orchard 示例推演

编码前，复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。先完成[第 1 阶段](../../01-parse-an-explicit-frontmatter-subset/docs/en.md)。

元数据标识技能包。Orchard-release 含有大写字母，不符合可移植的小写名称语法；名为 orchard-release 的技能若放在其他名称的目录中，则无法通过身份一致性校验。

```text
directory=orchard-release
name=orchard-release -> valid
name=orchard--release -> invalid name
```

## 构建与检查

按契约统计名称字节数和描述的 Unicode 标量值数量。解析后保留人类可读描述。

在学习者工作区实现本阶段。随附命令行辅助程序是调用你的函数的适配器，不会用参考实现替代你的代码。

```bash
python3 scripts/project_test.py skill-validator --stage 2 --path learning-artifacts/skill-validator
```

先预测上面的中间状态，再运行本阶段。全新的未实现代码应当失败；参考实现通过不代表你的学习者工作区已经完成。

## 继续探究

为什么更改目录名时也需要更改元数据？
