# 计算平均分前先核查证据

**第 2 阶段，共 4 阶段。** Python。预计约 2 小时。

计算词汇重叠前，先将缺失证据判为明确失败。数字和否定检查可识别某些矛盾论断，避免仅因词汇重叠而奖励它们。重叠分数是一种可检查的启发式方法，不具备真伪判定能力，也可能拒绝合理改写。

```figure
pj-report-judge-2
```

## 实现边界

```python
def support(claim, source):
    raise NotImplementedError("Implement the stage contract")
```

权威参考：[参考资料 1](https://www.rfc-editor.org/rfc/rfc8259).

## Orchard 示例推演

编码前，先学习 [Python 数据结构](https://docs.python.org/3/tutorial/datastructures.html)和[检索增强生成](../../../../../phases/11-llm-engineering/06-rag/docs/en.md). 请先完成 [第 1 阶段](../../01-claims/docs/en.md)。

词汇重叠无法反映关系。“Bob defeated Alice”和“Alice defeated Bob”的词完全相同，却颠倒了谁战胜谁。词序不匹配时拒绝自动通过，交由人工审阅；不能将这项检查称为语义理解。

```text
source: Alice defeated Bob
claim: Bob defeated Alice
word overlap=1; order check=false
result: order_requires_review
```

## 构建与检查

先完成否定与数字检查，再比较有顺序的内容词元。这项保守规则可能拒绝正确改写，因此要显示拒绝原因。

在学习者工作区实现本阶段。随附命令行辅助程序通过适配器导入你的函数，不会用参考解答代替未完成的实现。

```bash
python3 scripts/project_test.py report-judge --stage 2 --path learning-artifacts/report-judge
```

先预测上面的中间状态，再运行本阶段。全新起始代码应当失败；参考实现运行通过，不能证明你的学习者工作区已经完成。

## 继续探究

写出一个语义正确但被词汇规则拒绝的改写。人工判断它需要哪些证据？
