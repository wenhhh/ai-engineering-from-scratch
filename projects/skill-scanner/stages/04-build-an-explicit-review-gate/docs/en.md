# 建立明确的审阅门禁

**第 4 阶段，共 4 阶段。** Rust。预计约 2 小时。

达到阈值时要求审阅；低于阈值只表示这些规则没有达到配置门槛。限制问题数量，校验所有来源切片，并输出包含行号与逐字引文的文本报告。该门禁从不执行技能指令。

```figure
pj-skill-scanner-4
```

译注：图表范围：竖线被替换为换行，仅扫描一个文本框，不检查目录、文件数量与真实路径；直接输入 CRLF 时，图中引文会保留 CR，真实 Rust 区间不包含行结束符。

## 实现边界

```rust
pub fn review(text:&str,findings:&[Finding],threshold:u32,max_findings:usize)->Result<String,Error>
```

权威参考：[官方参考资料](https://agentskills.io/specification)。

## Orchard 示例推演

编码前，复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。先完成[第 3 阶段](../../03-score-distinct-evidence-without-inflation/docs/en.md)。

遍历调用方提供的技能包，以带版本号的 JSON 输出文件路径、行号、字节偏移量和来源引文。阈值用于请求审阅；低于阈值不构成技能安全声明。

```text
benign bundle -> below-threshold
reviewable bundle -> review-required
findings retain path + exact source slice
```

## 构建与检查

扫描前拒绝符号链接，并限制文件数量和字节数。将审阅状态与安装器完整性校验分开。

在学习者工作区实现本阶段。随附命令行辅助程序是调用你的函数的适配器，不会用参考实现替代你的代码。

```bash
python3 scripts/project_test.py skill-scanner --stage 4 --path learning-artifacts/skill-scanner
```

累计阶段全部通过后，从仓库根目录使用原始示例输入运行你的交付物：

```bash
rustc --edition=2021 learning-artifacts/skill-scanner/cli.rs -o learning-artifacts/skill-scanner/scanner
learning-artifacts/skill-scanner/scanner projects/skill-scanner/examples/reviewable 3
```

扫描器输出带版本号的 JSON，包含文件路径、精确的 UTF-8 字节区间和风险提示规则。显式模式可能漏过混淆内容，也可能标记无害文档。below-threshold 不等于安全；扫描状态从不替代安装完整性校验或人工审阅。

## 继续探究

批准升级之前，你会讨论哪一种新出现的问题？
