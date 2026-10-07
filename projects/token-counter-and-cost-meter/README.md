# 词元计数与成本计量器（Token Counter and Cost Meter）

核对用量，解释实际计费为何不同于事前估算。

从可见的近似计算开始。每词元四字符时，21 个 Unicode 标量值估算为六个词元。这是事前规划基线；服务商实际计数可能随语言、标点和分词器而变化。

## 从学习者工作区开始

[分词器](../../phases/10-llms-from-scratch/01-tokenizers/docs/en.md)、[验证门禁](../../phases/14-agent-engineering/38-verification-gates/docs/en.md)。语言基础：[Rust 所有权与 Result](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)。

需要安装 Rust（`rustc`）及 Python 3.10+。核心使用 Rust 标准库；Python 适配器在私有临时目录中编译。

```bash
python3 scripts/project_test.py token-counter-and-cost-meter --init learning-artifacts/token-counter-and-cost-meter
python3 scripts/project_test.py token-counter-and-cost-meter --stage 1 --path learning-artifacts/token-counter-and-cost-meter
```

## 构建路线

1. [在已说明的范围内估算文本](stages/01-estimate-text-with-a-documented-bound/docs/en.md)
2. [校验已记录的用量](stages/02-validate-recorded-usage/docs/en.md)
3. [用带溢出检查的整数计价](stages/03-price-with-checked-integers/docs/en.md)
4. [根据账本决定是否接纳任务](stages/04-admit-work-against-a-ledger/docs/en.md)

## 使用自己的输入

完成各阶段后，以下命令在原创 Orchard 示例上运行你的工作区代码。请将样本路径替换为自己的文件。

```bash
python3 learning-artifacts/token-counter-and-cost-meter/usage.py projects/token-counter-and-cost-meter/examples/usage.json --out usage-ledger.json
```

若想先检查完整参考实现，在同一命令中将 `learning-artifacts/token-counter-and-cost-meter` 替换为 `projects/token-counter-and-cost-meter/solution`。JSON 结果使用 `schema_version: 1`；路径和参数示例均已明确，便于其他工具读取。

## 集成边界

费率是明确提供的夹具输入，以每词元整数纳美元计量，不是当前服务商价格。usage.py 规范化已记录的用量 JSON，将带溢出检查的运算交给 Rust。账本通过 --out 保存顺序回放结果，不是在线计费服务，也不是并发预留存储。

```bash
python3 scripts/project_test.py token-counter-and-cost-meter --all --solution --strict
python3 scripts/project_test.py token-counter-and-cost-meter --all --path learning-artifacts/token-counter-and-cost-meter --strict
```

第一条命令检查参考实现，第二条检查你的实现。公开示例与测试属于回归证据，不是生产认证或未见过的基准。

## 权威参考资料

- [官方参考](https://doc.rust-lang.org/std/primitive.u64.html#method.checked_mul)

译注：展示范围：纳美元为十亿分之一美元，费率仅是输入夹具，不是当前报价。账本回放按实际用量记录超支；被预算阻止的请求不核验其后续实际用量，超过总额度后还会停止遍历，不能作为完整账单审计。
