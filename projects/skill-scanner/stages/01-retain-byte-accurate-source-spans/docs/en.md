# 保留精确到字节的来源区间

**第 1 阶段，共 4 阶段。** Rust。预计约 2 小时。

将 UTF-8 源文本拆成带编号的行，保留指向原始缓冲区的字节区间，终点采用不包含端点的语义。只移除行结束符。问题记录必须引用精确切片，不能在规范化之后重新拼出证据。

```figure
pj-skill-scanner-1
```

译注：图表范围：竖线被替换为换行，仅扫描一个文本框，不检查目录、文件数量与真实路径；直接输入 CRLF 时，图中引文会保留 CR，真实 Rust 区间不包含行结束符。

## 实现边界

```rust
pub fn spans(text:&str,max_bytes:usize)->Result<Vec<Span>,Error>
```

权威参考：[官方参考资料](https://agentskills.io/specification)。

## Orchard 示例推演

编码前，复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。

来源证据使用字节偏移量。包含 café 的一行所占 UTF-8 字节数多于可见字母数，因此不能用字符索引安全切片 Rust 字符串。分行时保留起点和终点偏移量。

```text
text="café\n.env"
first line bytes [0,5)
second line bytes [6,10)
```

## 构建与检查

按原始行的字节数推进游标，包含换行符。只在展示引文时移除 CRLF 行结束符。

在学习者工作区实现本阶段。随附命令行辅助程序是调用你的函数的适配器，不会用参考实现替代你的代码。

```bash
python3 scripts/project_test.py skill-scanner --init learning-artifacts/skill-scanner
python3 scripts/project_test.py skill-scanner --stage 1 --path learning-artifacts/skill-scanner
```

先预测上面的中间状态，再运行本阶段。全新的未实现代码应当失败；参考实现通过不代表你的学习者工作区已经完成。

## 继续探究

错误偏移量会如何使原本正确的问题记录变成无效证据？
