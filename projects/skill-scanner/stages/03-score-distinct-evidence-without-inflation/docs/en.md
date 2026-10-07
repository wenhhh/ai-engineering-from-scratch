# 对不同证据计分，避免重复抬分

**第 3 阶段，共 4 阶段。** Rust。预计约 2 小时。

同一规则在同一来源行中只计一次，即使收集器重复提交了该问题。使用溢出检查加法累加严重程度。拒绝超出范围的严重程度和不可能的偏移量，防止格式损坏的扫描数据伪装成低分。

```figure
pj-skill-scanner-3
```

译注：图表范围：竖线被替换为换行，仅扫描一个文本框，不检查目录、文件数量与真实路径；直接输入 CRLF 时，图中引文会保留 CR，真实 Rust 区间不包含行结束符。

## 实现边界

```rust
pub fn risk_score(findings:&[Finding])->Result<u32,Error>
```

权威参考：[官方参考资料](https://agentskills.io/specification)。

## Orchard 示例推演

编码前，复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。先完成[第 2 阶段](../../02-detect-named-advisory-patterns/docs/en.md)。

同一规则在同一来源行中只获得一次对应严重程度分数。重复检测不能增加风险分，但一行中的两种不同能力仍属于不同证据。

```text
line 7 secret-access severity 2, repeated twice -> 2
line 7 network-command severity 2 -> total 4
```

## 构建与检查

校验区间与严重程度后，再按规则和行号去重。累加总分时检查溢出。

在学习者工作区实现本阶段。随附命令行辅助程序是调用你的函数的适配器，不会用参考实现替代你的代码。

```bash
python3 scripts/project_test.py skill-scanner --stage 3 --path learning-artifacts/skill-scanner
```

先预测上面的中间状态，再运行本阶段。全新的未实现代码应当失败；参考实现通过不代表你的学习者工作区已经完成。

## 继续探究

为什么只按行去重会掩盖第二种能力？
