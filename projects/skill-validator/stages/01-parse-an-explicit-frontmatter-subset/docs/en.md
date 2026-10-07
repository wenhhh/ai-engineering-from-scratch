# 解析明确限定的元数据头子集

**第 1 阶段，共 4 阶段。** Rust。预计约 2 小时。

仅分离位于开头的 --- 块。接受普通或与 JSON 兼容的双引号单行键值对；保留值内部的冒号，拒绝重复键，从不解释 YAML 标签和别名。该解析器刻意只支持 YAML 子集，不是通用 YAML 实现。

```figure
pj-skill-validator-1
```

译注：图表范围：不解析真实元数据头，不检查描述非空及 1024 字符上限，也不访问资源文件；资源正文不计入图中预算。完整加载与路径校验由 Rust 实现执行。

## 实现边界

```rust
pub fn parse(text: &str) -> Result<std::collections::BTreeMap<String,String>, Error>
```

权威参考：[官方参考资料](https://agentskills.io/specification)。

## Orchard 示例推演

编码前，复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

安装器输出带引号的元数据。接受普通单行标量，以及与 JSON 兼容的双引号标量，包括转义引号和 Unicode。拒绝标签、别名和多行 YAML，避免静默改变其解释。

```text
description: "Check \"replicas\" first"
parsed description: Check "replicas" first
description: | -> unsupported syntax
```

## 构建与检查

在元数据头一行的第一个冒号处分割。元数据校验前先解码带引号的值；重复键视为冲突。

在学习者工作区实现本阶段。随附命令行辅助程序是调用你的函数的适配器，不会用参考实现替代你的代码。

```bash
python3 scripts/project_test.py skill-validator --init learning-artifacts/skill-validator
python3 scripts/project_test.py skill-validator --stage 1 --path learning-artifacts/skill-validator
```

先预测上面的中间状态，再运行本阶段。全新的未实现代码应当失败；参考实现通过不代表你的学习者工作区已经完成。

## 继续探究

为什么一个兼容标准的子集解析器需要明确的不支持语法错误？
