# 在已说明的范围内估算文本

**第 1 阶段，共 4 阶段。** Rust。预计约 2 小时。

统计 Unicode 标量值，使用可配置的每词元字符比率，并向上取整。这种有意粗略的估算适合事前告警。之后精确的准入计算使用已记录的服务商用量，不把该估算冒充 BPE。

```figure
pj-token-counter-and-cost-meter-1
```

译注：图表范围：使用 JavaScript Number 演示一条请求的费用和预留，不执行 Rust 的 u64 溢出与输入类型校验，也不回放整个账本。估算不是服务商词元计数，夹具费率不是当前报价。

## 实现边界

```rust
pub fn estimate(text:&str, chars_per_token:u64)->Result<u64,Error>
```

权威来源：[官方参考](https://doc.rust-lang.org/std/primitive.u64.html#method.checked_mul)。

## Orchard 示例推演

编码前，阅读[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)和[分词器](../../../../../phases/10-llms-from-scratch/01-tokenizers/docs/en.md)。

从可见的近似计算开始。每词元四字符时，21 个 Unicode 标量值估算为六个词元。这是事前规划基线；服务商实际计数可能随语言、标点和分词器而变化。

```text
characters=21; ratio=4
ceil(21/4)=6 estimated tokens
```

## 构建与检查

使用商和余数判断实现向上取整，避免加上 ratio-1 时溢出。不能把这个结果标为服务商分词器计数。

在自己的学习者工作区实现本阶段。CLI 辅助程序是随附适配器，导入你的函数，不会替换为参考解答。

```bash
python3 scripts/project_test.py token-counter-and-cost-meter --init learning-artifacts/token-counter-and-cost-meter
python3 scripts/project_test.py token-counter-and-cost-meter --stage 1 --path learning-artifacts/token-counter-and-cost-meter
```

先预测上面的中间状态，再运行本阶段。全新起始代码会失败；参考实现通过，不代表你的学习者工作区已经完成。

## 继续探究

两种语言字符数相同，为何词元数可能不同？
