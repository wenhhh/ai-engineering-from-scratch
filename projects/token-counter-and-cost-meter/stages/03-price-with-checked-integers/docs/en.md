# 用带溢出检查的整数计价

**第 3 阶段，共 4 阶段。** Rust。预计约 2 小时。

夹具费率表以每词元纳美元计量，分别计算未缓存输入、缓存输入和输出费用。每次乘法与加法都检查溢出，不让浮点舍入悄悄改变账单。

```figure
pj-token-counter-and-cost-meter-3
```

译注：图表范围：使用 JavaScript Number 演示一条请求的费用和预留，不执行 Rust 的 u64 溢出与输入类型校验，也不回放整个账本。估算不是服务商词元计数，夹具费率不是当前报价。

## 实现边界

```rust
pub fn cost(usage:&Usage,rates:&Rates)->Result<u64,Error>
```

权威来源：[官方参考](https://doc.rust-lang.org/std/primitive.u64.html#method.checked_mul)。

## Orchard 示例推演

编码前，阅读[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)和[分词器](../../../../../phases/10-llms-from-scratch/01-tokenizers/docs/en.md)。 先完成[第 2 阶段](../../02-validate-recorded-usage/docs/en.md)。

使用提供的整数费率表，单位为每词元纳美元。当费率 input=2、output=5、cached=1 时，该已记录请求的费用为 260 纳美元。这些夹具费率不是当前服务商价格。

```text
60 uncached * 2 = 120
40 cached * 1 = 40
20 output * 5 = 100
total=260 nano_dollars
```

## 构建与检查

使用带溢出检查的 u64 乘法与加法。不要将各部分先转成浮点美元再舍入。

在自己的学习者工作区实现本阶段。CLI 辅助程序是随附适配器，导入你的函数，不会替换为参考解答。

```bash
python3 scripts/project_test.py token-counter-and-cost-meter --stage 3 --path learning-artifacts/token-counter-and-cost-meter
```

先预测上面的中间状态，再运行本阶段。全新起始代码会失败；参考实现通过，不代表你的学习者工作区已经完成。

## 继续探究

如果整数运算静默回绕，溢出会怎样影响预算准入？
