# 校验已记录的用量

**第 2 阶段，共 4 阶段。** Rust。预计约 2 小时。

缓存输入是全部输入的子集，不能作为额外词元类别重复相加。缓存数量超过总输入的服务商记录无效。从明确的逗号分隔夹具格式解析三个计数器，拒绝正负号和缺失字段。

```figure
pj-token-counter-and-cost-meter-2
```

译注：图表范围：使用 JavaScript Number 演示一条请求的费用和预留，不执行 Rust 的 u64 溢出与输入类型校验，也不回放整个账本。估算不是服务商词元计数，夹具费率不是当前报价。

## 实现边界

```rust
pub fn parse_usage(line:&str)->Result<Usage,Error>
```

权威来源：[官方参考](https://doc.rust-lang.org/std/primitive.u64.html#method.checked_mul)。

## Orchard 示例推演

编码前，阅读[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)和[分词器](../../../../../phases/10-llms-from-scratch/01-tokenizers/docs/en.md)。 先完成[第 1 阶段](../../01-estimate-text-with-a-documented-bound/docs/en.md)。

JSON 适配器读取记录中的输入、输出用量及缓存输入详情；Rust 校验对应的 input,output,cached 三元组。缓存词元属于输入词元子集，不能另加一笔输入费用。

```text
input_tokens=100; output_tokens=20; cached_tokens=40
wire=100,20,40
uncached input=60
```

## 构建与检查

拒绝布尔值、负值以及超过输入总数的缓存计数。服务商响应规范化放在运算核心之外。

在自己的学习者工作区实现本阶段。CLI 辅助程序是随附适配器，导入你的函数，不会替换为参考解答。

```bash
python3 scripts/project_test.py token-counter-and-cost-meter --stage 2 --path learning-artifacts/token-counter-and-cost-meter
```

先预测上面的中间状态，再运行本阶段。全新起始代码会失败；参考实现通过，不代表你的学习者工作区已经完成。

## 继续探究

服务商响应缺少必需输入用量时，应如何处理？
