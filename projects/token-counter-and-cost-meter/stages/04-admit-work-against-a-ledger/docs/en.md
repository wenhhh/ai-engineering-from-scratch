# 根据账本决定是否接纳任务

**第 4 阶段，共 4 阶段。** Rust。预计约 2 小时。

只有已花费金额加报价不超过配置上限时，才预留报价金额。恰好等于上限可接受，被拒绝的预留不会修改账本。本例为单进程记账，不承诺并发分布式保证。

```figure
pj-token-counter-and-cost-meter-4
```

译注：图表范围：使用 JavaScript Number 演示一条请求的费用和预留，不执行 Rust 的 u64 溢出与输入类型校验，也不回放整个账本。估算不是服务商词元计数，夹具费率不是当前报价。

## 实现边界

```rust
pub fn reserve(spent:&mut u64,quote:u64,limit:u64)->Result<u64,Error>
```

权威来源：[官方参考](https://doc.rust-lang.org/std/primitive.u64.html#method.checked_mul)。

## Orchard 示例推演

编码前，阅读[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)和[分词器](../../../../../phases/10-llms-from-scratch/01-tokenizers/docs/en.md)。 先完成[第 3 阶段](../../03-price-with-checked-integers/docs/en.md)。

根据记录用量回放预留。第一个 Orchard 请求预留 600，实际结算 260，释放 340。之后仅剩 430 时，需要 1,500 的请求会被阻止。保存的 JSON 保留请求 ID 和全部结算字段。

```text
limit=1000
request 1 reserved=600 actual=260 unused=340
request 2 actual=310 -> spent=570
remaining=430; larger reservation -> blocked
```

## 构建与检查

即使实际用量超过估算，结算也必须记录它。明确标记超支，不要通过截断计费值来隐藏。

在自己的学习者工作区实现本阶段。CLI 辅助程序是随附适配器，导入你的函数，不会替换为参考解答。

```bash
python3 scripts/project_test.py token-counter-and-cost-meter --stage 4 --path learning-artifacts/token-counter-and-cost-meter
```

累计阶段通过后，从仓库根目录运行你的交付物，使用原始样本输入：

```bash
python3 learning-artifacts/token-counter-and-cost-meter/usage.py projects/token-counter-and-cost-meter/examples/usage.json --out usage-ledger.json
```

费率是明确提供的夹具输入，以每词元整数纳美元计量，不是当前服务商价格。usage.py 规范化已记录的用量 JSON，将带溢出检查的运算交给 Rust。账本通过 --out 保存顺序回放结果，不是在线计费服务，也不是并发预留存储。

## 继续探究

agent-budget-planner 可以复用哪些字段，才能避免将报价混同于实际用量？
